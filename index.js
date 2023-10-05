const express = require("express");
const redis = require("redis");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const redisClient = redis.createClient({
  host: "127.0.0.1",
  port: 6379,
});
redisClient.connect("");
redisClient.on("connect", () => {
  console.log("Connected to Redis");
});

redisClient.on("error", (err) => {
  console.error("Redis error:", err);
});

app.post("/set", (req, res) => {
  const key = "11";
  const value = "hy";
  console.log(key, value);
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

app.get("/getKeys", async (req, res) => {
  const key = "status";
  let getKeyName = await redisClient.get(key);
  console.log(getKeyName);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
