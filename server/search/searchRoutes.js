const express = require("express");
const {
  verifyToken,
  checkUser,
  isAdmin,
  isBusinessOwner,
} = require("../middleware/auth.middleware");
const {
  adminSearch,
  userSearch,
  ownerSearch,
} = require("./searchController");

const router = express.Router();

router.post("/admin/search", verifyToken, checkUser, isAdmin, adminSearch);
router.post("/search", verifyToken, checkUser, userSearch);
router.post(
  "/owner/search",
  verifyToken,
  checkUser,
  isBusinessOwner,
  ownerSearch,
);

module.exports = router;
