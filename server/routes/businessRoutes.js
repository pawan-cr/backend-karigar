const express = require("express");
const router = express.Router();
const { upload, deleteFile } = require("../middleware/upload");
const {
  verifyToken,
  checkUser,
  isBusinessOwner,
} = require("../middleware/auth.middleware");

const {
  registerBusiness,
  getMyBusinesses,
  updateBusiness,
  updateBusinessTiming,
  updateBusinessImages,
  deleteBusiness,
} = require("../api/business/businessController");
const { replyToReview, getBusinessReviews } = require("../api/review/reviewController");
const {
  getBusinessAnalytics,
} = require("../api/businessAnalytics/analyticsController");
const {
  getMyNotifications,
  markNotificationRead,
} = require("../api/notification/notificationController");
const { getActiveBanners } = require("../api/banner/bannerController");
const { getActiveCities } = require("../api/cities/citiesController");
const { getSubCategories, getCategories } = require("../api/category/categoryController");
const { getRecentViews, addRecentView } = require("../api/recentView/recentController");

// Business routes
router.post(
  "/business/register",
  verifyToken,
  checkUser,
  isBusinessOwner,
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "business_images", maxCount: 5 },
  ]),
  registerBusiness,
);
router.post(
  "/business/me",
  verifyToken,
  checkUser,
  isBusinessOwner,
  getMyBusinesses,
);
router.post(
  "/business/update",
  verifyToken,
  checkUser,
  isBusinessOwner,
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "business_images", maxCount: 5 },
  ]),
  updateBusiness,
);
router.post(
  "/business/timing",
  verifyToken,
  checkUser,
  isBusinessOwner,
  updateBusinessTiming,
);
router.post(
  "/business/images",
  verifyToken,
  checkUser,
  isBusinessOwner,
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "business_images", maxCount: 5 },
  ]),
  updateBusinessImages,
);
router.post(
  "/business/delete",
  verifyToken,
  checkUser,
  isBusinessOwner,
  deleteBusiness,
);

// Reviews routes
router.post(
  "/reviews/reply",
  verifyToken,
  checkUser,
  isBusinessOwner,
  replyToReview,
);
router.post("/reviews/business/list", getBusinessReviews);

// Analytics routes
router.post(
  "/analytics/business",
  verifyToken,
  checkUser,
  isBusinessOwner,
  getBusinessAnalytics,
);

// Notifications routes
router.post("/notifications/list", verifyToken, checkUser, getMyNotifications);
router.post(
  "/notifications/read",
  verifyToken,
  checkUser,
  markNotificationRead,
);

// Banners routes 
router.post("/banners/list", getActiveBanners);

// Category + SubCategory routes
router.post("/categories/list", getCategories);
router.post("/categories/sub-categories/list", getSubCategories);

// Cities Routes
router.post("/cities/list", getActiveCities);

// Recent Routes
router.post("/recents/list", verifyToken, checkUser, getRecentViews);
router.post("/recents/add", verifyToken, checkUser, addRecentView);

module.exports = router;
