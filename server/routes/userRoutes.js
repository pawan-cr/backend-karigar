const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const {
  verifyToken,
  checkUser,
  optionalCheckUser,
} = require("../middleware/auth.middleware");
const { getActiveBanners } = require("../api/banner/bannerController");
const {
  getHomeSections,
  getApprovedBusinesses,
  getBusinessDetails,
  trackBusinessAction,
} = require("../api/business/businessController");
const {
  getCategories,
  getSubCategories,
} = require("../api/category/categoryController");
const { getActiveCities } = require("../api/cities/citiesController");
const {
  getMyFavourites,
  saveFavourite,
  removeFavourite,
} = require("../api/favourites/favouriteController");
const {
  getMyNotifications,
  markNotificationRead,
} = require("../api/notification/notificationController");
const {
  addRecentView,
  getRecentViews,
} = require("../api/recentView/recentController");
const { createReport } = require("../api/reports/reportController");
const {
  getBusinessReviews,
  addReview,
  getMyReviews,
  editReview,
  deleteReview,
  voteReview,
} = require("../api/review/reviewController");

// banner routes
router.post("/list", getActiveBanners);

// business routes
router.post("/home", getHomeSections);
router.post("/list", getApprovedBusinesses);
router.post("/details", optionalCheckUser, getBusinessDetails);
router.post("/track", trackBusinessAction);

// category routes
router.post("/list", getCategories);
router.post("/sub-categories/list", getSubCategories);

// city routes
router.post("/list", getActiveCities);

// favourite routes
router.post("/", verifyToken, checkUser, getMyFavourites);
router.post("/save", verifyToken, checkUser, saveFavourite);
router.post("/remove", verifyToken, checkUser, removeFavourite);

// notification routes
router.post("/list", verifyToken, checkUser, getMyNotifications);
router.post("/read", verifyToken, checkUser, markNotificationRead);

// recent view routes
router.post("/", verifyToken, checkUser, getRecentViews);
router.post("/add", verifyToken, checkUser, addRecentView);

// report routes
router.post("/business/create", verifyToken, checkUser, createReport);

// review routes
router.post("/business/list", getBusinessReviews);
router.post(
  "/business/add",
  verifyToken,
  checkUser,
  upload.array("review_images", 5),
  addReview,
);
router.post("/me", verifyToken, checkUser, getMyReviews);
router.post(
  "/edit",
  verifyToken,
  checkUser,
  upload.array("review_images", 5),
  editReview,
);
router.post("/delete", verifyToken, checkUser, deleteReview);
router.post("/vote", verifyToken, checkUser, voteReview);

module.exports = router;
