const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

const signAppToken = (user) =>
  jwt.sign(
    {
      uid: user.firebase_uid,
      userId: user._id.toString(),
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );

const verifyAppToken = (token) => jwt.verify(token, JWT_SECRET);

module.exports = { signAppToken, verifyAppToken, JWT_SECRET, JWT_EXPIRES_IN };
