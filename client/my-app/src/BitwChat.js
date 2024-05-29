import React, {useEffect, useState } from 'react'
import ScrollToBottom from 'react-scroll-to-bottom';

function BitwChat({socket, username, room}) {
    const [currentMessage, setCurrentMessage] = useState("");
    const [messageList, setMessageList] = useState([]);

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
        // Cleanup the socket event listener to avoid memory leaks
        return () => {
        socket.off("receive_message");
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
                <input type = "text" 
                value = {currentMessage}
                placeholder = "hello world..."
                 onChange={(event) => {
                    setCurrentMessage(event.target.value);
                   }}
                onKeyPress={handleKeyPress} // Call sendMessage function on Enter key press
                />
                <button onClick={sendMessage}>&#9658;</button>
            </div>

        </div>
    );
}

export default BitwChat