import React, {useEffect, useState } from 'react'
import ScrollToBottom from 'react-scroll-to-bottom';

function BitwChat({socket, username, room}) {
    const [currentMessage, setCurrentMessage] = useState("");
    const [messageList, setMessageList] = useState([]);
    // const [scoreList, setScoreList] = useState([]);

    const sendMessage = async () =>{
        if(currentMessage !== "" ){
            const messageData = {
                room: room,
                author: username,
                message: currentMessage,
                time: new Date(Date.now()).getHours() + ":" + new Date(Date.now()).getMinutes(),

            };
            
            await socket.emit("send_message", messageData);
            //enables us to see our own message
            setMessageList((list) => [...list, messageData]);
            //clears the input box after send message
            setCurrentMessage("");
        }
    };

    //event for keypress of enter to send message 
    const handleKeyPress = (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    };

 //calls functions whenever there is a change either by you or other people on the socket 
    useEffect(() => {
        socket.on("receive_message", (data) => {
        //displays previous list of messages and the new message           
          setMessageList((list) => [...list, data]);
        });
        
        // socket.on("update_board", (data) => {
        //   setScoreList((playerList) => {
        //     // check if the player exists in the list
        //     const playerIndex = playerList.findIndex(player => player.id === data.id);
        //     // if player exists in the list
        //     if (playerIndex > -1) {
        //         // get the existing list
        //         const updatedScores = [...playerList];
        //         // update the display score at the player's index
        //         updatedScores[playerIndex].score = data.score;
        //         return updatedScores;
        //     } else {
        //         // add new player score
        //         return [...playerList, data];
        //     }
        //   });
        // });

        // Cleanup the socket event listener to avoid memory leaks
        return () => {
        socket.off("receive_message");
        socket.off("update_score");
    };
    }, [socket]);
    return (
        <div className= "chat-window">
            <div className="chat-header">
                <p>Live Chat</p>
            </div>
            <div className="chat-body">
            <ScrollToBottom className="message-container">
          {messageList.map((messageContent) => {
            return (
              <div
                className="message"
                id={username === messageContent.author ? "you" : "other"}
              >
                <div>
                  <div className="message-content">
                    <p>{messageContent.message}</p>
                  </div>
                  <div className="message-meta">
                    <p id="time">{messageContent.time}</p>
                    <p id="author">{messageContent.author}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </ScrollToBottom>
          </div>
            <div className="chat-footer">
                <input type = "text" value = {currentMessage} placeholder = "hello world..."
                 onChange={(event) => {
                    setCurrentMessage(event.target.value);
                   }}
                onKeyPress={handleKeyPress} // Call sendMessage function on Enter key press
                />
                <button onClick={sendMessage}>&#9658;</button>
            </div>
            <div className="leaderboard">
              <h3>Leaderboard</h3>
                  
            </div> 
          </div>
    );
}

export default BitwChat