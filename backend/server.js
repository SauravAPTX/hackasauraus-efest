const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files (e.g., for a client app)
app.use(express.static('public'));

// Handle WebRTC signaling
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Forward SDP offers and answers
    socket.on('offer', (data) => {
        console.log('Offer received:', data);
        socket.to(data.to).emit('offer', { from: socket.id, sdp: data.sdp });
    });

    socket.on('answer', (data) => {
        console.log('Answer received:', data);
        socket.to(data.to).emit('answer', { from: socket.id, sdp: data.sdp });
    });

    // Forward ICE candidates
    socket.on('ice-candidate', (data) => {
        console.log('ICE candidate received:', data);
        socket.to(data.to).emit('ice-candidate', { from: socket.id, candidate: data.candidate });
    });

    // Notify when a user disconnects
    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
    });
});

// Start the server
const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
});
