const express = require("express");
const router = express.Router();
const {
  verifyToken,
  checkUser,
  isAdmin,
} = require("../middleware/auth.middleware");
const {
  getMyNotifications,
  createNotification,
  markNotificationRead,
} = require("../api/notification/notificationController");

router.post("/list", verifyToken, checkUser, getMyNotifications);
router.post("/create", verifyToken, checkUser, isAdmin, createNotification);
router.post("/read", verifyToken, checkUser, markNotificationRead);

module.exports = router;
