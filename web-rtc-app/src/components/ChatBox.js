import React, { useState, useRef, useEffect } from 'react';
import { FileText, X } from 'lucide-react';
import './ChatBox.css'

const ChatBox = ({ messages, sendMessage, fileTransfers, sendFile }) => {
    const [inputMessage, setInputMessage] = useState('');
    const [showFileTransfer, setShowFileTransfer] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, fileTransfers]);

    const handleSendMessage = () => {
        if (inputMessage.trim()) {
            sendMessage(inputMessage);
            setInputMessage('');
        }
    };

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            sendFile(file);
            setShowFileTransfer(false);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current.click();
    };

    const renderFileTransfers = () => {
        return fileTransfers.map((transfer, index) => {
            const progressStyle = { width: `${transfer.progress}%` };
            return (
                <div key={index} className="file-transfer-item">
                    <div className="file-info">
                        <FileText size={20} />
                        <span>{transfer.name}</span>
                    </div>
                    <div className="file-progress">
                        <div 
                            className="progress-bar" 
                            style={progressStyle}
                        ></div>
                        <span>{Math.round(transfer.progress)}%</span>
                    </div>
                    {transfer.status === 'complete' && transfer.downloadUrl && (
                        <a 
                            href={transfer.downloadUrl} 
                            download={transfer.name}
                            className="download-link"
                        >
                            Download
                        </a>
                    )}
                </div>
            );
        });
    };

    return (
        <div className="chat-box">
            <div className="chat-messages">
                {messages.map((msg, index) => (
                    <div 
                        key={index} 
                        className={`message ${msg.self ? 'self' : 'other'}`}
                    >
                        {msg.text}
                    </div>
                ))}
                
                {fileTransfers.length > 0 && (
                    <div className="file-transfers">
                        {renderFileTransfers()}
                    </div>
                )}
                
                <div ref={messagesEndRef} />
            </div>
            
            <div className="chat-input">
                <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..."
                />
                <button onClick={triggerFileInput} className="file-upload-btn">
                    <FileText size={20} />
                </button>
                <button onClick={handleSendMessage}>Send</button>
                
                <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />
            </div>
        </div>
    );
};

export default ChatBox;