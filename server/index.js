
//gets the libraries 
const express = require("express");
const app = express();
const http = require("http");
const cors = require("cors");
const {Server} = require("socket.io");
const path = require("path"); // Import the path module

app.use(cors());

// Middleware to set the correct MIME type for CSS files
app.use((req, res, next) => {
    if (req.url.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
    }
    next();
});

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, '../client/build')));



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
    { city: "Auckland", coordinates: [174.763336, -36.848461, 300.0]},
    { city: "Rome", coordinates: [12.496366, 41.902782, 300.0]},
    { city: "Paris", coordinates: [2.349014, 48.864716, 300.0]}
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

        const cityData = cityForEachRoom[data];
        console.log(`Sending city data to room ${data}`, cityData);
        io.to(data).emit("city_data", cityData);

        // initialise the cityFotEachRoom object so that each room gets a different city
        console.log(`User with ID ${socket.id} joined room: ${data}`);
        console.log(`User ${socket.id} score: ${allPlayers[socket.id].score}`);
    });


    //listens from the client side the send_message event
    socket.on("send_message", (data) =>{
        let currentCity = cityForEachRoom[data.room].city;
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
            let playerKeys = Object.keys(allPlayers);

            for (let i = 0; i < playerKeys.length; i += 2) { 
                let playerKey = playerKeys[i];
                let player = allPlayers[playerKey];
                if (player.room === data.room && player.isCorrect) {
                    isCorrectCount++;
                }
            }

            // get the number of players for each room
            let allRooms = getRoomCount();
            // check if the room exists 
            if(allRooms[data.room]){
                // if everyone in the room has guessed correct
                if (isCorrectCount == Math.ceil(allRooms[data.room].count / 2)){
                    // if the cityIndex is more than or equal to the length of the cities array
                    if (cityIndex >= shuffledArray.length){
                        // set index back to the first city
                        cityIndex = 0;
                    }
                    
                    // replace the current city with the next city (cityIndex should be forward at this point)
                    cityForEachRoom[data.room] = shuffledArray[cityIndex];
                    // increment cityIndex for the next new city
                    cityIndex++;

                    const cityData = cityForEachRoom[data.room];
                    io.to(data).emit("city_data", cityData);

                    console.log(cityForEachRoom[data.room]);

                    // reset all player's stats 
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

    socket.on("get_city", (data) => {
        console.log(data);
        console.log(cityToSend);
        if (cityToSend[socket.id]) {
            socket.emit("send_city", cityToSend[socket.id]);
        } else {
            socket.emit("send_city", "City not set yet");
        }
    })

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