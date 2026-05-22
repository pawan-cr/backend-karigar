const express = require("express");
const router = express.Router();
const { verifyToken, checkUser } = require("../middleware/auth.middleware");
const {
  addRecentView,
  getRecentViews,
} = require("../api/recentView/recentController");

router.post("/", verifyToken, checkUser, getRecentViews);
router.post("/add", verifyToken, checkUser, addRecentView);

module.exports = router;
