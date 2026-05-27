const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const {
  verifyToken,
  checkUser,
  optionalCheckUser,
} = require("../middleware/auth.middleware");

const {
  loginUser,
  getMe,
  updateProfile,
  updateFcmToken,
} = require("../api/auth/auth.controller");
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
const { getActiveBanners } = require("../api/banner/bannerController");
const {
  getBusinessReviews,
  addReview,
  getMyReviews,
  editReview,
  deleteReview,
  voteReview,
} = require("../api/review/reviewController");
const {
  getMyFavourites,
  saveFavourite,
  removeFavourite,
} = require("../api/favourites/favouriteController");
const {
  getRecentViews,
  addRecentView,
} = require("../api/recentView/recentController");
const {
  getMyNotifications,
  markNotificationRead,
} = require("../api/notification/notificationController");
const { createReport } = require("../api/reports/reportController");


// Public: Business routes
router.post("/business/home", getHomeSections);
router.post("/business/list", getApprovedBusinesses);
router.post("/business/details", optionalCheckUser, getBusinessDetails);
router.post("/business/track", trackBusinessAction);

// Public: Categories routes
router.post("/categories/list", getCategories);
router.post("/categories/sub-categories/list", getSubCategories);

// Public: Cities routes
router.post("/cities/list", getActiveCities);

// Public: Banners routes
router.post("/banners/list", getActiveBanners);

// Public: Reviews routes
router.post("/reviews/business/list", getBusinessReviews);


// Authenticated: Reviews routes
router.use(verifyToken);
router.use(checkUser);

router.post(
  "/reviews/business/add",
  upload.array("review_images", 5),
  addReview,
);
router.post("/reviews/me", getMyReviews);
router.post("/reviews/edit", upload.array("review_images", 5), editReview);
router.post("/reviews/delete", deleteReview);
router.post("/reviews/vote", voteReview);

//  Favourites routes
router.post("/favourites/list", getMyFavourites);
router.post("/favourites/save", saveFavourite);
router.post("/favourites/remove", removeFavourite);

// Recent Views routes
router.post("/recent-views/list", getRecentViews);
router.post("/recent-views/add", addRecentView);

// Notifications routes
router.post("/notifications/list", getMyNotifications);
router.post("/notifications/read", markNotificationRead);

// Reports routes
router.post("/reports/create", createReport);

module.exports = router;
