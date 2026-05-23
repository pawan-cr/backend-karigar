const express = require("express");
const router = express.Router();
const {
  verifyToken,
  verifyFirebaseToken,
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
  searchAdmin,
} = require("../api/auth/auth.controller");

router.post("/login", verifyFirebaseToken, loginUser);
router.post("/me", verifyToken, checkUser, getMe);
router.post("/profile", verifyToken, checkUser, updateProfile);

router.post("/users", verifyToken, checkUser, isAdmin, getAllUsers);
router.post("/search", verifyToken, checkUser, isAdmin, searchAdmin);
router.post("/users/block", verifyToken, checkUser, isAdmin, blockUser);
router.post(
  "/users/role",
  verifyToken,
  checkUser,
  isAdmin,
  changeUserRole,
);

module.exports = router;
