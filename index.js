const express = require("express");
const http = require("http");

const cors = require("cors");
const app = express();

const Server = require("socket.io");
const server = http.createServer(app);

const io = Server(server, {
  cors: {
    origin: ["http://localhost:4200"],
  },
});

app.use(cors());

io.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("live_message", (message) => {
    console.log(`Received message from client side: ${message}`);
  });
});

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});
