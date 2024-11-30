import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io("http://192.168.93.20:3000"); // Replace with the local IP of Laptop 1 (host)

const Laptop1 = () => {
  const [peerConnection, setPeerConnection] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  useEffect(() => {
    // Set up WebRTC connection on Laptop 1 (Host)
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] // STUN server for NAT traversal
    });

    setPeerConnection(pc);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("send-ice-candidate", event.candidate);
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    // Capture local media (camera/audio)
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setLocalStream(stream);
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
      })
      .catch(err => console.error('Error getting media:', err));

    // Listen for incoming offer
    socket.on("receive-offer", async (offer) => {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("send-answer", answer);
    });

    // Listen for ICE candidates
    socket.on("receive-ice-candidate", (candidate) => {
      pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    return () => {
      socket.off("receive-offer");
      socket.off("receive-ice-candidate");
    };
  }, []);

  const handleStartCall = () => {
    // When Laptop 1 (host) starts the call, create and send an offer
    peerConnection.createOffer()
      .then((offer) => peerConnection.setLocalDescription(offer))
      .then(() => socket.emit("send-offer", peerConnection.localDescription));
  };

  return (
    <div>
      <h2>Laptop 1 (Host)</h2>
      <button onClick={handleStartCall} disabled={isConnected}>Start Call</button>
      <video
        ref={(ref) => { if (ref) ref.srcObject = localStream; }}
        autoPlay
        muted
        width="300"
      />
      <video
        ref={(ref) => { if (ref) ref.srcObject = remoteStream; }}
        autoPlay
        width="300"
      />
    </div>
  );
};

export default Laptop1;
