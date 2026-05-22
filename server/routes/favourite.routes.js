const express = require("express");
const router = express.Router();
const { verifyToken, checkUser } = require("../middleware/auth.middleware");
const {
  getMyFavourites,
  saveFavourite,
  removeFavourite,
} = require("../api/favourites/favouriteController");

router.post("/", verifyToken, checkUser, getMyFavourites);
router.post("/save", verifyToken, checkUser, saveFavourite);
router.post("/remove", verifyToken, checkUser, removeFavourite);

module.exports = router;
