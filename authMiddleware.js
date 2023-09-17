const jwt = require("jsonwebtoken");
const secretKey = "my-secret-key";

const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ error: "Access denied, missing token." });
  }

  try {
    const decoded = jwt.verify(token, secretKey1);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token." });
  }
};

module.exports = authMiddleware;
