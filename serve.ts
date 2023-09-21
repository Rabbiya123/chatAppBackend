const express = require("express");
const bodyParser = require("body-parser");

const mongoose = require("mongoose");
const cors = require("cors");

const jwt = require("jsonwebtoken");
const app = express();

const authMiddleware = require("./authMiddleware");
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors());

const http = require("http");
const Server = require("socket.io");

const server = http.createServer(app);

const secretKey1 = "my-secret-key";
const connectedUsers = {};
let receiverid = "";
let senderid = "";
//-----------------------------------------------------------------
const io = Server(server, {
  cors: {
    origin: ["http://localhost:4200"],
  },
});

app.use(cors());

io.on("connection", (socket) => {
  console.log("User connected");
  socket.on("joinchat", (roomid) => {
    socket.join(roomid);
    console.log(`User joined room: ${roomid}`);

    socket.emit("roomJoined", `Joined room ${roomid}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });

  socket.on("live_message", (message) => {
    console.log("Received message from client:", message);
    io.to(message.receiver).emit("live_message", message);
  });
});

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});
//--------------------------------------------------------------

// Connect to MongoDB0
mongoose.connect("mongodb://localhost:27017/signup_app", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
//-------------------------------------------------------------
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  role: String,
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);

//---------Signup-----------------------------------
app.post("/api/signup", async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ error: "Email is already taken" });
      return;
    }
    const newUser = new User({ username, email, password, role });
    await newUser.save();
    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
});

// login

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });

    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      secretKey1,
      {
        expiresIn: "1h",
      }
    );
    res.json({
      token,
      userId: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
});

app.get("/api/agents", authMiddleware, async (req, res) => {
  try {
    const agents = await User.find({ role: "agent" });

    res.status(200).json(agents);
  } catch (error) {
    res.status(500).json({ error: "An error occurred while fetching agents" });
  }
});
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({});
    res.status(200).json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "An error occurred while fetching users" });
  }
});
