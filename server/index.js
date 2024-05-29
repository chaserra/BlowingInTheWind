
//gets the libraries 
const express = require("express");
const app = express();
const http = require("http");
const cors = require("cors");
const {Server} = require("socket.io");

app.use(cors());

//generate a server 
const server =  http.createServer(app);
const io = new Server(server, {
    cors: {
        //might change when we have our own dowmain 
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
    },
} );

// initialise cities array
let citiesArray = [
    { cityName: "Auckland", coordinates: [174.763336, -36.848461, 300.0]},
    { cityName: "Rome", coordinates: [12.496366, 41.902782, 300.0]},
    { cityName: "Paris", coordinates: [2.349014, 48.864716, 300.0]}
] 

// method for shuffling an array
function shuffleArray(array){
    let currentIndex = array.length;
    while(currentIndex != 0){
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
}

// shuffle cities array
let shuffledArray = [...citiesArray]
shuffleArray(shuffledArray);

// initialise necessary objects
let allPlayers = {};
let cityForEachRoom = {};
let cityIndex = 0; 

//listen a connection  event from client
//socket is specific to a client  
io.on("connection", (socket) => {
    console.log(`user connected ${socket.id}`);

    //listens from client side if they joined a room - gets data (in this case the room) from that particular client 
    socket.on("join_room", (data) => {
        socket.join(data);

        // initialise the allPlayers object for each player
        allPlayers[socket.id] = {
            room: data,
            score: 0,
            isCorrect: false,
            guesses: new Set()
        }

        if (!cityForEachRoom[data]) {
            if(cityIndex > shuffledArray.length){
                cityIndex = 0;
            } else {
                cityForEachRoom[data] = shuffledArray[cityIndex];
                cityIndex++;    
            }
        }

        // initialise the cityFotEachRoom object so that each room gets a different city
        console.log(`User with ID ${socket.id} joined room: ${data}`);
        console.log(`User ${socket.id} score: ${allPlayers[socket.id].score}`);

        console.log(cityForEachRoom);   
    });


    //listens from the client side the send_message event
    socket.on("send_message", (data) =>{
        let currentCity = cityForEachRoom[data.room].cityName;
        let player = allPlayers[socket.id];
        let correctMsg = {
            room: data.room,
            author: 'Program',
            message: `${data.author} guessed correctly!`,
            time: new Date(Date.now()).getHours() + ":" + new Date(Date.now()).getMinutes(),
        };

        // check if the player's guess already exists in their set
        if(player.guesses.has(data.message.toLowerCase())){
            correctMsg.message = `${data.author} has already guessed correctly.`;
            
            io.in(data.room).emit("receive_message", correctMsg);
        }
        else if (data.message.toLowerCase() == currentCity.toLowerCase()){
            // increment player score by 1
            player.score++;
            // add the user's correct guess to their set
            player.guesses.add(data.message);
            // set player's isCorrect to true
            player.isCorrect = true;

            console.log(allPlayers);
            io.in(data.room).emit("receive_message", correctMsg);

            let isCorrectCount = 0;
            for (let player in allPlayers) {
                if (allPlayers[player].room === data.room && allPlayers[player].isCorrect) {
                    isCorrectCount++;
                }
            }

            // check if all players in the room have guessed correctly
            let allRooms = getRoomCount();
            if(allRooms[data.room]){
                if (isCorrectCount == allRooms[data.room].count){
                    // move on to the next for the room (i.e room 1 moves on to Paris when they had Rome)
                    if (cityIndex >= shuffledArray.length){
                        cityIndex = 0;
                    }
                    
                    cityForEachRoom[data.room] = shuffledArray[cityIndex];
                    cityIndex++;

                    console.log(cityForEachRoom);

                    // reset all players' isCorrect to false and clear their guesses
                    for (let player in allPlayers) {
                        if (allPlayers[player].room === data.room) {
                            allPlayers[player].isCorrect = false;
                            allPlayers[player].guesses.clear();
                        }
                    }
                }
            }
        } else {
            socket.to(data.room).emit("receive_message", data);
        }

        let playerScore = {
            id: socket.id,
            name: data.author,
            score: player.score,
        };

        io.in(data.room).emit("update_board", playerScore);
    });

    socket.on('chat_message', (data) => {
        console.log('Message from chat:', data);
        socket.emit('message', {text: "Hello from server hehe"});
    });

    socket.on("disconnect", (data) =>{
        console.log("user disconnect", socket.id);
        delete allPlayers[socket.id];
    });

    function getRoomCount(){
        let roomCounts = {};
        for (let player in allPlayers){
            let room = allPlayers[player].room;
            if (roomCounts[room]){
                roomCounts[room].count++;
            } else {
                roomCounts[room] = { count: 1 };
            }
        }

        return roomCounts;
    }
});

server.listen(3001, ()=> {
    console.log("server running");
});