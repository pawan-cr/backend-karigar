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
  updateFcmToken,
} = require("../api/auth/auth.controller");
const upload = require("../middleware/upload")

// For Multer Upload => upload.single("fieldname")
router.post("/login", verifyToken, loginUser);
router.post("/me", verifyToken, checkUser, getMe);
router.post("/profile", verifyToken, checkUser, upload.single("profile_image"),updateProfile);

router.post("/users", verifyToken, checkUser, isAdmin, getAllUsers);
router.post("/search", verifyToken, checkUser, isAdmin, searchAdmin);
router.post("/users/block", verifyToken, checkUser, isAdmin, blockUser);
router.post("/users/role", verifyToken, checkUser, isAdmin, changeUserRole);

router.post("/fcm-token", verifyToken, checkUser, updateFcmToken);

module.exports = router;
