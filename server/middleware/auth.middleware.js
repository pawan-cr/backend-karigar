const { auth } = require("../config/firebase");
const User = require("../api/user/userModel");
const { verifyAppToken } = require("../utils/jwt");

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.warn(
      "[verifyToken] Missing or malformed Authorization header:",
      authHeader,
    );
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = await auth.verifyIdToken(token);
    req.user = decoded;
    req.authType = "firebase";
    return next();
  } catch (firebaseError) {
    console.warn(
      "[verifyToken] Firebase verification failed:",
      firebaseError.message,
    );

    try {
      const payload = verifyAppToken(token);
      req.user = {
        uid: payload.uid,
        userId: payload.userId,
        role: payload.role,
      };
      req.authType = "jwt";
      return next();
    } catch (jwtError) {
      console.error(
        "[verifyToken] JWT verification also failed:",
        jwtError.message,
      );
      console.error(
        "[verifyToken] Both Firebase and JWT verification failed for token (first 20 chars):",
        token?.slice(0, 20) + "...",
      );
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  }
};

const checkUser = async (req, res, next) => {
  try {
    let user;

    if (req.authType === "jwt" && req.user.userId) {
      user = await User.findById(req.user.userId);
    }

    if (!user && req.user.uid) {
      user = await User.findOne({ firebase_uid: req.user.uid });
    }

    if (!user) {
      console.warn("[checkUser] User not found for req.user:", req.user);
      return res.status(404).json({ message: "User not found" });
    }

    if (user.is_blocked) {
      console.warn("[checkUser] Blocked user attempted access:", user._id);
      return res
        .status(403)
        .json({ message: "Your account has been blocked by admin" });
    }
    req.dbUser = user;
    next();
  } catch (err) {
    console.error("[checkUser] Internal error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const isAdmin = async (req, res, next) => {
  if (!req.dbUser) {
    return res.status(500).json({ message: "Internal server error" });
  }
  if (req.dbUser.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

const isBusinessOwner = async (req, res, next) => {
  if (!req.dbUser) {
    return res.status(500).json({ message: "Internal server error" });
  }
  if (!["businessOwner", "admin", "both"].includes(req.dbUser.role)) {
    return res.status(403).json({ message: "Business owner access required" });
  }
  next();
};

const isVerifier = async (req, res, next) => {
  if (!req.dbUser) {
    return res.status(500).json({ message: "Internal server error" });
  }
  if (!["manager", "admin"].includes(req.dbUser.role)) {
    return res.status(403).json({ message: "Verifier access required" });
  }
  next();
};

const optionalCheckUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];
  try {
    try {
      const decoded = await auth.verifyIdToken(token);
      req.user = decoded;
      req.authType = "firebase";
    } catch (firebaseError) {
      const payload = verifyAppToken(token);
      req.user = {
        uid: payload.uid || payload.firebase_uid,
        userId: payload.userId,
        role: payload.role,
      };
      req.authType = "jwt";
    }

    let user;
    if (req.authType === "jwt" && req.user.userId) {
      user = await User.findById(req.user.userId);
    }
    if (!user && req.user.uid) {
      user = await User.findOne({ firebase_uid: req.user.uid });
    }
    if (user && !user.is_blocked) {
      req.dbUser = user;
    }
  } catch (error) {
    // optional auth — continue without user
  }
  return next();
};

module.exports = {
  verifyToken,
  checkUser,
  optionalCheckUser,
  isAdmin,
  isBusinessOwner,
  isVerifier,
};
