const { auth } = require("../config/firebase");
const User = require("../api/user/userModel");

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = await auth.verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const checkUser = async (req, res, next) => {
  try {
    const user = await User.findOne({ firebase_uid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.is_blocked) {
      return res
        .status(403)
        .json({ message: "Your account has been blocked by admin" });
    }
    req.dbUser = user;
    next();
  } catch (err) {
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
  if (!["businessOwner", "admin"].includes(req.dbUser.role)) {
    return res.status(403).json({ message: "Business owner access required" });
  }
  next();
};

// const isAdmin = async (req, res, next) => {
//   try {
//     const user = await User.findOne({ firebase_uid: req.user.uid });
//     if (!user || user.role !== "admin") {
//       return res.status(401).json({ message: "Unauthorized: Admins only" });
//     }
//     req.dbUser = user;
//     next();
//   } catch (error) {
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

// const isBusinessOwner = async (req, res, next) => {
//   try {
//     const user = await User.findOne({ firebase_uid: req.user.uid });
//     if (!user || !["businessOwner", "admin"].includes(user.role)) {
//       return res
//         .status(401)
//         .json({ message: "Unauthorized: Business Owners only" });
//     }
//     req.dbUser = user;
//     next();
//   } catch (error) {
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

module.exports = { verifyToken, checkUser, isAdmin, isBusinessOwner };
