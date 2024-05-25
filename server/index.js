
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
let shuffledArray = []
shuffleArray(citiesArray);

for (let i = 0; i < citiesArray.length; i++){
    shuffledArray.push(citiesArray[i]);
}

// initialise playerScores object that will contain socket.id scores
let playerScores = {};
let playerGuesses = {};

//listen a connection  event from client
//socket is specific to a client  
io.on("connection", (socket) => {
    console.log(`user connected ${socket.id}`);

    //listens from client side if they joined a room - gets data (in this case the room) from that particular client 
    socket.on("join_room", (data) => {
        socket.join(data);
        // Initialise each player's score to 0
        playerScores[socket.id] = 0;
        // Initialise a set for each player for their guesses
        playerGuesses[socket.id] = new Set();

        console.log(`User with ID ${socket.id} joined room: ${data}`);
        console.log(`User ${socket.id} score: ${playerScores[socket.id]}`);

        console.log(shuffledArray[0].cityName);
    });

    //listens from the client side the send_message event
    socket.on("send_message", (data) =>{
        let currentCity = shuffledArray[0].cityName;
        let correctMsg = {
            room: data.room,
            author: 'Program',
            message: `${data.author} guessed correctly!`,
            time: new Date(Date.now()).getHours() + ":" + new Date(Date.now()).getMinutes(),
        };

        // check if the player's guess already exists in their set
        if(playerGuesses[socket.id].has(data.message.toLowerCase())){
            correctMsg.message = `${data.author} has already guessed correctly.`;
            
            io.in(data.room).emit("receive_message", correctMsg);
        }
        else if (data.message.toLowerCase() == currentCity.toLowerCase()){
            // increment player score by 1
            playerScores[socket.id]++;
            // add the user's correct guess to their set
            playerGuesses[socket.id].add(data.message);
            console.log(playerScores);

            io.in(data.room).emit("receive_message", correctMsg);
        } else {
            socket.to(data.room).emit("receive_message", data);
        }

        let playerScore = {
            id: socket.id,
            name: data.author,
            score: playerScores[socket.id],
        };

        //io.in(data.room).emit("update_board", playerScore);
    });

    socket.on("disconnect", (data) =>{
        console.log("user disconnect", socket.id);
        delete playerScores[socket.id];
        delete playerGuesses[socket.id];
    });

});

server.listen(3001, ()=> {
    console.log("server running");
});