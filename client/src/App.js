import { useState } from 'react';
import './App.css';
import BitwChat from './BitwChat';
import socket from './SocketInstance';


function App() {
  //initialises user and room state 
  const [username, serUserName] = useState("");
  const [room, setRoom] = useState("");
  const [showChat, setShowChat] = useState(false);

  const joinRoom = async () => {
    if (username !== "" && room !== "") {
      socket.emit("join_room", room);
      window.joinRoom(room);
      setShowChat(true);
    }
  };

  return (
    <div className="App">
      {/* shows the chat only when show chat is set to true */}
      {!showChat ? (
      <div className = "joinChatContainer">
      <h3>Join Game</h3>
      <input type = "text" placeholder = "John..." 
      //whenever the user changes their input, it also changes the username in the username state
       onChange={(event) => {
        serUserName(event.target.value);
       }}/>

      <input type = "text" placeholder = "Room ID..." 
      //whenever the user changes their input, it also changes the username in the username state
       onChange={(event) => {
        setRoom(event.target.value);
       }}/>
      
      <button onClick ={joinRoom}> Join a Game</button>
      </div>
      ) : (
       
       <BitwChat socket={socket} username={username} room={room} />
  )}
    </div>
  );
}

export default App;
