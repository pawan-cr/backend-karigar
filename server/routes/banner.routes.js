const express = require("express");
const router = express.Router();
const {
  verifyToken,
  checkUser,
  isAdmin,
} = require("../middleware/auth.middleware");
const {
  getActiveBanners,
  createBanner,
  updateBanner,
} = require("../api/banner/bannerController");

router.post("/list", getActiveBanners);
router.post("/create", verifyToken, checkUser, isAdmin, createBanner);
router.post("/update", verifyToken, checkUser, isAdmin, updateBanner);

module.exports = router;
