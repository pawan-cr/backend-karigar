const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const {
  verifyToken,
  checkUser,
  optionalCheckUser,
  isBusinessOwner,
} = require("../middleware/auth.middleware");
const {
  getBusinessAnalytics,
} = require("../api/businessAnalytics/analyticsController");
const { getActiveBanners } = require("../api/banner/bannerController");
const {
  registerBusiness,
  getMyBusinesses,
  updateBusiness,
  updateBusinessTiming,
  updateBusinessImages,
  deleteBusiness,
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
  getBusinessReviews,
  replyToReview,
} = require("../api/review/reviewController");

// analytics routes
router.post(
  "/business",
  verifyToken,
  checkUser,
  isBusinessOwner,
  getBusinessAnalytics,
);

// banner routes
router.post("/list", getActiveBanners);

// business routes
router.post(
  "/register",
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
  "/owner/me",
  verifyToken,
  checkUser,
  isBusinessOwner,
  getMyBusinesses,
);
router.post(
  "/update",
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
  "/timing",
  verifyToken,
  checkUser,
  isBusinessOwner,
  updateBusinessTiming,
);
router.post(
  "/images",
  verifyToken,
  checkUser,
  isBusinessOwner,
  updateBusinessImages,
);
router.post("/delete", verifyToken, checkUser, isBusinessOwner, deleteBusiness);
router.post("/home", getHomeSections);
router.post("/list", getApprovedBusinesses);
router.post("/details", optionalCheckUser, getBusinessDetails);
router.post("/track", trackBusinessAction);

// category routes
router.post("/list", getCategories);
router.post("/sub-categories/list", getSubCategories);

// city routes
router.post("/list", getActiveCities);

// review routes
router.post("/business/list", getBusinessReviews);
router.post("/reply", verifyToken, checkUser, isBusinessOwner, replyToReview);

module.exports = router;
