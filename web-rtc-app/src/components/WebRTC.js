import React, { useRef, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import ChatBox from './ChatBox';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, PhoneIncoming, 
  RefreshCw, X, MessageCircle, Share2, ScreenShare, ScreenShareOff
} from 'lucide-react';
import './WebRTC.css'

import FileTransfer from './FileTransfer';

const SOCKET_SERVER_URL = process.env.REACT_APP_SOCKET_SERVER_URL || 'http://localhost:3000';

const WebRTC = () => {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const screenShareRef = useRef(null);
    const dataChannelRef = useRef(null);

    // Connection States
    const [isConnected, setIsConnected] = useState(false);
    const [matchStatus, setMatchStatus] = useState('Not Connected');
    const [socket, setSocket] = useState(null);
    const [peerConnection, setPeerConnection] = useState(null);
    
    // Media States
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    // Chat Messages
    const [messages, setMessages] = useState([]);
    const [fileTransfers, setFileTransfers] = useState([]);

    // Skill Tags
    const [availableTags, setAvailableTags] = useState([
        'React', 'Vue', 'Angular', 'Node.js', 'Python', 'Java', 
        'Machine Learning', 'Data Science', 'Cybersecurity', 
        'Cloud Computing', 'Blockchain', 'DevOps', 
        'Frontend', 'Backend', 'Mobile Development'
    ]);
    const [selectedTags, setSelectedTags] = useState([]);
    const [currentTag, setCurrentTag] = useState('');
    const [tagSuggestions, setTagSuggestions] = useState([]);

    // Matching Preferences
    const [maxMatchTime, setMaxMatchTime] = useState(15); 
    const [languagePreference, setLanguagePreference] = useState('English');

    // ICE Servers Configuration
    const iceServers = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { 
                urls: 'turn:openrelay.metered.ca:80',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            }
        ]
    };

    // Send Message Function
    const sendMessage = (message) => {
        setMessages(prev => [...prev, { text: message, self: true }]);
        if (socket) {
            socket.emit('chat_message', message);
        }
    };
    // File Transfer Functions
    const sendFile = (file) => {
        if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
            alert('Data channel is not open');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const fileData = e.target.result;
            const fileMetadata = {
                name: file.name,
                size: file.size,
                type: file.type
            };

            // Send file metadata first
            dataChannelRef.current.send(JSON.stringify({
                type: 'file_metadata',
                metadata: fileMetadata
            }));

            // Then send file chunks
            const chunkSize = 16 * 1024; // 16KB chunks
            for (let start = 0; start < fileData.byteLength; start += chunkSize) {
                const chunk = fileData.slice(start, start + chunkSize);
                dataChannelRef.current.send(JSON.stringify({
                    type: 'file_chunk',
                    chunk: Array.from(new Uint8Array(chunk)),
                    start: start
                }));
            }

            // Add file transfer to state
            setFileTransfers(prev => [...prev, {
                ...fileMetadata,
                status: 'sending',
                progress: 0
            }]);
        };
        reader.readAsArrayBuffer(file);
    };

    // Tag Handling
    const handleTagInput = useCallback((e) => {
        const input = e.target.value;
        setCurrentTag(input);

        const suggestions = availableTags
            .filter(tag => 
                tag.toLowerCase().includes(input.toLowerCase()) && 
                !selectedTags.includes(tag)
            )
            .slice(0, 5);
        
        setTagSuggestions(suggestions);
    }, [availableTags, selectedTags]);

    const addTag = useCallback((tag) => {
        if (availableTags.includes(tag) && !selectedTags.includes(tag)) {
            setSelectedTags(prev => [...prev, tag]);
            setCurrentTag('');
            setTagSuggestions([]);
        }
    }, [availableTags, selectedTags]);

    const removeTag = useCallback((tagToRemove) => {
        setSelectedTags(prev => prev.filter(tag => tag !== tagToRemove));
    }, []);

    // Media Control Functions
    const toggleVideoStream = useCallback(() => {
        const videoTrack = localVideoRef.current?.srcObject
            ?.getTracks()
            .find(track => track.kind === 'video');
        
        if (videoTrack) {
            videoTrack.enabled = !isVideoEnabled;
            setIsVideoEnabled(prev => !prev);
        }
    }, [isVideoEnabled]);

    const toggleAudioStream = useCallback(() => {
        const audioTrack = localVideoRef.current?.srcObject
            ?.getTracks()
            .find(track => track.kind === 'audio');
        
        if (audioTrack) {
            audioTrack.enabled = !isAudioEnabled;
            setIsAudioEnabled(prev => !prev);
        }
    }, [isAudioEnabled]);

    // Screen Sharing
    const toggleScreenShare = async () => {
        if (!isScreenSharing) {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
                    video: true 
                });
                
                if (peerConnection) {
                    const videoTrack = screenStream.getVideoTracks()[0];
                    const sender = peerConnection.getSenders()
                        .find(s => s.track.kind === 'video');
                    
                    if (sender) {
                        sender.replaceTrack(videoTrack);
                    }
                }

                screenShareRef.current.srcObject = screenStream;
                setIsScreenSharing(true);

                screenStream.getVideoTracks()[0].onended = () => {
                    toggleScreenShare();
                };
            } catch (error) {
                console.error('Screen sharing error:', error);
            }
        } else {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: true 
            });

            if (peerConnection) {
                const videoTrack = stream.getVideoTracks()[0];
                const sender = peerConnection.getSenders()
                    .find(s => s.track.kind === 'video');
                
                if (sender) {
                    sender.replaceTrack(videoTrack);
                }
            }

            localVideoRef.current.srcObject = stream;
            screenShareRef.current.srcObject = null;
            setIsScreenSharing(false);
        }
    };

    // Connection Establishment
    const startConnection = async () => {
        try {
            if (selectedTags.length === 0) {
                alert('Please select at least one skill tag');
                return;
            }

            const newSocket = io(SOCKET_SERVER_URL);
            setSocket(newSocket);
            setMatchStatus('Searching for match...');

            newSocket.emit('find_match', { 
                tags: selectedTags,
                maxMatchTime,
                languagePreference
            });

            const newPeerConnection = new RTCPeerConnection(iceServers);
            setPeerConnection(newPeerConnection);

            newPeerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    newSocket.emit('ice-candidate', event.candidate);
                }
            };

            newPeerConnection.ontrack = (event) => {
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = event.streams[0];
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: true 
            });

            stream.getTracks().forEach((track) => 
                newPeerConnection.addTrack(track, stream)
            );

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            newSocket.on('match_found', (matchData) => {
                setMatchStatus(`Matched with ${matchData.username}`);
            });

            newSocket.on('offer', async (offer) => {
                await newPeerConnection.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await newPeerConnection.createAnswer();
                await newPeerConnection.setLocalDescription(answer);
                newSocket.emit('answer', answer);
            });

            newSocket.on('answer', async (answer) => {
                await newPeerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            });

            newSocket.on('ice-candidate', async (candidate) => {
                try {
                    await newPeerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (error) {
                    console.error('Error adding ICE candidate', error);
                }
            });

            setIsConnected(true);
            const dataChannel = newPeerConnection.createDataChannel('fileTransfer');
            dataChannelRef.current = dataChannel;

            dataChannel.onopen = () => {
                console.log('Data channel opened');
            };

            dataChannel.onmessage = (event) => {
                const data = JSON.parse(event.data);
                
                if (data.type === 'file_metadata') {
                    // Handle incoming file metadata
                    setFileTransfers(prev => [...prev, {
                        ...data.metadata,
                        status: 'receiving',
                        progress: 0,
                        chunks: []
                    }]);
                } else if (data.type === 'file_chunk') {
                    // Handle incoming file chunks
                    setFileTransfers(prev => prev.map(transfer => {
                        if (transfer.name === data.fileName) {
                            const updatedChunks = [...transfer.chunks, ...data.chunk];
                            const progress = (updatedChunks.length / transfer.size) * 100;
                            
                            if (progress >= 100) {
                                // Reconstruct file
                                const blob = new Blob([new Uint8Array(updatedChunks)], { type: transfer.type });
                                const url = URL.createObjectURL(blob);
                                
                                return {
                                    ...transfer,
                                    status: 'complete',
                                    progress: 100,
                                    downloadUrl: url
                                };
                            }
                            
                            return {
                                ...transfer,
                                chunks: updatedChunks,
                                progress: Math.min(progress, 99)
                            };
                        }
                        return transfer;
                    }));
                }
            };

        } catch (error) {
            console.error('Connection error:', error);
            alert('Failed to start connection. Check console for details.');
        }
    };

    // End Connection
    const endConnection = () => {
        if (peerConnection) {
            peerConnection.close();
        }
        if (socket) {
            socket.disconnect();
        }
        setIsConnected(false);
        setMatchStatus('Not Connected');
    };

    // Matching Preferences and Tag Selection Component
    const MatchingSetup = () => (
        <div className="matching-preferences-container">
            <div className="matching-preferences">
                <div className="max-match-time">
                    <label>Max Match Time (minutes):</label>
                    <input 
                        type="number" 
                        value={maxMatchTime}
                        onChange={(e) => setMaxMatchTime(Number(e.target.value))}
                        min="5" 
                        max="60"
                    />
                </div>
                <div className="language-preference">
                    <label>Language:</label>
                    <select 
                        value={languagePreference}
                        onChange={(e) => setLanguagePreference(e.target.value)}
                    >
                        <option>English</option>
                        <option>Spanish</option>
                        <option>French</option>
                        <option>German</option>
                    </select>
                </div>
            </div>

            <div className="skill-tag-selection">
                <div className="tag-input-container">
                    <input 
                        type="text" 
                        value={currentTag}
                        onChange={handleTagInput}
                        placeholder="Enter skill tags"
                        className="tag-input"
                    />
                    {currentTag && tagSuggestions.length > 0 && (
                        <div className="tag-suggestions">
                            {tagSuggestions.map(suggestion => (
                                <button 
                                    key={suggestion} 
                                    onClick={() => addTag(suggestion)}
                                    className="suggestion-item"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="selected-tags">
                    {selectedTags.map(tag => (
                        <div key={tag} className="selected-tag">
                            {tag}
                            <button onClick={() => removeTag(tag)} className="remove-tag">
                                <X size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="match-status">
                {matchStatus}
            </div>
        </div>
    );

    return (
        <div className="webrtc-layout">
            {!isConnected && <MatchingSetup />}

            <div className="remote-video-container">
                <video 
                    ref={remoteVideoRef} 
                    className="remote-video"
                    autoPlay 
                />
                <div className="video-overlay">
                    <button className="overlay-btn">
                        <MessageCircle size={20} />
                    </button>
                </div>
            </div>

            <div className="sidebar">
                <div className="local-video-container">
                    <video 
                        ref={localVideoRef} 
                        className="local-video"
                        autoPlay 
                        muted 
                    />
                    <div className="local-video-controls">
                        <button 
                            onClick={toggleVideoStream} 
                            className={`media-toggle ${!isVideoEnabled ? 'disabled' : ''}`}
                        >
                            {isVideoEnabled ? <Video /> : <VideoOff />}
                        </button>
                        <button 
                            onClick={toggleAudioStream} 
                            className={`media-toggle ${!isAudioEnabled ? 'disabled' : ''}`}
                        >
                            {isAudioEnabled ? <Mic /> : <MicOff />}
                        </button>
                        <button 
                            onClick={toggleScreenShare} 
                            className={`media-toggle ${isScreenSharing ? 'active' : ''}`}
                        >
                            {isScreenSharing ? <ScreenShareOff /> : <ScreenShare />}
                        </button>
                    </div>
                </div>

                <ChatBox 
    messages={messages} 
    sendMessage={sendMessage} 
    fileTransfers={fileTransfers}
    sendFile={sendFile}
/>

                <div className="controls">
                    {!isConnected ? (
                        <button 
                            onClick={startConnection} 
                            className="btn btn-primary"
                            disabled={selectedTags.length === 0}
                        >
                            <PhoneIncoming /> Find Match
                        </button>
                    ) : (
                        <button 
                            onClick={endConnection} 
                            className="btn btn-danger"
                        >
                            <PhoneOff /> End Call
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WebRTC;