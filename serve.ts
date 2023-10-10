const express = require("express");
const bodyParser = require("body-parser");
const redis = require("redis");
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
let content = "";
let userKey = "";
// --------------------------------------------------------------

const redisClient = redis.createClient(6379, "127.0.0.1");
redisClient.connect();
redisClient.on("connect", () => {
  console.log("Connected to Redis");
});

//----------------------------------------------------------------------

//Simple store key and value in redis database
app.post("/set", (req, res) => {
  const { key, value } = req.body;

  if (!key || !value) {
    return res.status(400).send("Both key and value are required.");
  }
  redisClient.set(key, value, (err, reply) => {
    if (err) {
      console.error("Redis Error:", err);
      res.status(500).send("Error setting value in Redis");
    } else {
      console.log(`Key '${key}' set in Redis with value '${value}'`);
      res.status(200).send(`Key '${key}' set successfully in Redis`);
    }
  });
});

//-----------------------------------------------------------------
app.post("/loginUserId", (req, res) => {
  userKey = req.body.userId;
  console.log("Received user ID:", userKey);
  res.json({ message: "User ID received successfully" });
});

//-------------------------------------

const io = Server(server, {
  cors: {
    origin: ["http://localhost:4200"],
  },
});

app.use(cors());

io.on("connection", async (socket) => {
  console.log("User connected");
  const value = "online";
  console.log("this is userid inner of socket", userKey);
  redisClient.HSET("user-presence", userKey, value, (err, reply) => {
    if (err) {
      console.error("Redis Error:", err);
    }
  });

  app.get("/onlineUser", async (req, res) => {
    try {
      const onlineUser = await redisClient.HGETALL(
        "user-presence",
        (err, reply) => {
          if (err) {
            console.error("Redis Error:", err);
          }
        }
      );
      res.status(200).json(onlineUser);
    } catch (error) {
      res
        .status(500)
        .json({ error: "An error occurred while fetching onlineUser" });
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
    redisClient.HDEL("user-presence", userKey, (err, reply) => {
      if (err) {
        console.error("error while deleting the UserKey");
      }
    });
  });

  socket.on("message", async (message) => {
    console.log("Received message from client:", message);
    senderid = message.sender;
    socket.broadcast.emit("message", message.content);
    try {
      const newMessage = new Message({
        sender: message.sender,
        receiver: message.receiver,
        content: message.content,
        username: message.username,
        receiverName: message.receiverName,
      });

      await newMessage.save();
    } catch (error) {
      console.error("Error saving message:", error);
    }
  });
});
const messageSchema = new mongoose.Schema({
  sender: String,
  receiver: String,
  content: String,
  username: String,
  receiverName: String,
  timestamp: { type: Date, default: Date.now },
});

const Message = mongoose.model("messages", messageSchema);

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
  is_online: { type: String, default: "0" },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);

//---------Signup-----------------------------------
app.post("/api/signup", async (req, res) => {
  try {
    const { username, email, password, role, is_online } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ error: "Email is already taken" });
      return;
    }
    const newUser = new User({ username, email, password, role, is_online });
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
// find the only agents role from database
app.get("/api/agents", authMiddleware, async (req, res) => {
  try {
    const agents = await User.find({ role: "agent" });

    res.status(200).json(agents);
  } catch (error) {
    res.status(500).json({ error: "An error occurred while fetching agents" });
  }
});

app.get("/", (req, res) => {
  res.send("This is server side");
});

//create an api to find the user's from the list
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({});
    res.status(200).json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "An error occurred while fetching users" });
  }
});

app.get("/api/messages/user/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const messages = await Message.find({
      $or: [{ username: user.username }, { receiverName: user.username }],
    });

    if (!messages || messages.length === 0) {
      return res
        .status(404)
        .json({ error: "No messages found for this user." });
    }

    res.status(200).json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "An error occurred" });
  }
});
