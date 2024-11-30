const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let usersQueue = [];

io.on("connection", (socket) => {
  console.log("A user connected");

  // Handle starting a connection and pairing user based on filter
  socket.on("start-connection", ({ filter }) => {
    console.log(`User selected filter: ${filter || "None"}`);

    // If no filter is selected, perform random matching
    if (!filter) {
      pairRandomUser(socket);
    } else {
      pairUserByFilter(socket, filter);
    }
  });

  // Function to pair a user randomly
  const pairRandomUser = (socket) => {
    const randomUser = usersQueue.find(
      (user) => user.socketId !== socket.id
    );

    if (randomUser) {
      socket.emit("match-found", randomUser);
      io.to(randomUser.socketId).emit("match-found", {
        name: "User 2",
        age: 30,
        interest: "Music",
      });

      // Remove both users from the queue
      usersQueue = usersQueue.filter((user) => user.socketId !== socket.id && user.socketId !== randomUser.socketId);
    } else {
      usersQueue.push({ socketId: socket.id, filter: null });
      socket.emit("no-users-in-queue");
    }
  };

  // Function to pair users based on filter
  const pairUserByFilter = (socket, filter) => {
    const matchingUser = usersQueue.find(
      (user) => user.filter === filter && user.socketId !== socket.id
    );

    if (matchingUser) {
      socket.emit("match-found", matchingUser);
      io.to(matchingUser.socketId).emit("match-found", {
        name: "User 2",
        age: 30,
        interest: "Music",
      });

      // Remove both users from the queue
      usersQueue = usersQueue.filter((user) => user.socketId !== socket.id && user.socketId !== matchingUser.socketId);
    } else {
      usersQueue.push({ socketId: socket.id, filter });
      socket.emit("no-users-in-queue");
    }
  };

  socket.on("disconnect", () => {
    console.log("A user disconnected");
    // Remove disconnected user from the queue
    usersQueue = usersQueue.filter((user) => user.socketId !== socket.id);
  });
});

server.listen(3000, "0.0.0.0", () => {
    console.log("Server is running on port 3000");
});

