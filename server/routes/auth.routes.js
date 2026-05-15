const express = require("express");
const router = express.Router();
const {
  verifyToken,
  checkUser,
  isAdmin,
} = require("../middleware/auth.middleware");
const {
  loginUser,
  getMe,
  updateProfile,
  blockUser,
  getAllUsers,
  changeUserRole,
} = require("../api/auth/auth.controller");

router.post("/login", verifyToken, loginUser);
router.get("/me", verifyToken, getMe);
router.put("/profile", verifyToken, updateProfile);

// admin only routes
router.get("/users", verifyToken, checkUser, isAdmin, getAllUsers);
router.put("/users/:userId/block", verifyToken, checkUser, isAdmin, blockUser);
router.put(
  "/users/:userId/role",
  verifyToken,
  checkUser,
  isAdmin,
  changeUserRole,
);

module.exports = router;
