const express = require("express");
const router = express.Router();
const {
  verifyToken,
  checkUser,
  isAdmin,
  isBusinessOwner,
} = require("../middleware/auth.middleware");
const {
  getAdminDashboard,
  getBusinessAnalytics,
  getAdminActivityLog,
} = require("../api/businessAnalytics/analyticsController");

router.post("/dashboard", verifyToken, checkUser, isAdmin, getAdminDashboard);
router.post("/activity-log", verifyToken, checkUser, isAdmin, getAdminActivityLog);
router.post(
  "/business",
  verifyToken,
  checkUser,
  isBusinessOwner,
  getBusinessAnalytics,
);

module.exports = router;
