const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const {
  verifyToken,
  checkUser,
  optionalCheckUser,
  isAdmin,
  isVerifier,
} = require("../middleware/auth.middleware");
const {
  getAdminDashboard,
  getAdminActivityLog,
} = require("../api/businessAnalytics/analyticsController");
const {
  getActiveBanners,
  createBanner,
  updateBanner,
} = require("../api/banner/bannerController");
const {
  getHomeSections,
  getApprovedBusinesses,
  getBusinessDetails,
  trackBusinessAction,
  suspendBusiness,
} = require("../api/business/businessController");
const {
  getCategories,
  createCategory,
  updateCategory,
  createSubCategory,
  getSubCategories,
  updateSubCategory,
} = require("../api/category/categoryController");
const {
  createCity,
  getAllCities,
  getCityById,
  updateCity,
  deleteCity,
  getActiveCities,
} = require("../api/cities/citiesController");
const {
  createNotification,
} = require("../api/notification/notificationController");
const {
  getAllReports,
  getReportById,
  approveReport,
  rejectReport,
  updateReportStatus,
  getBusinessReports,
} = require("../api/reports/reportController");
const {
  getBusinessReviews,
  updateReviewStatus,
} = require("../api/review/reviewController");
const {
  getVerificationBusinesses,
  approveBusiness,
  rejectBusiness,
  getVerificationHistory,
} = require("../api/verification/verificationController");

// analytics routes
router.post("/dashboard", verifyToken, checkUser, isAdmin, getAdminDashboard);
router.post(
  "/activity-log",
  verifyToken,
  checkUser,
  isAdmin,
  getAdminActivityLog,
);

// banner routes
router.post("/list", getActiveBanners);
router.post(
  "/create",
  verifyToken,
  checkUser,
  isAdmin,
  upload.single("banner_image"),
  createBanner,
);
router.post("/update", verifyToken, checkUser, isAdmin, updateBanner);

// business routes
router.post("/home", getHomeSections);
router.post("/list", getApprovedBusinesses);
router.post("/details", optionalCheckUser, getBusinessDetails);
router.post("/track", trackBusinessAction);
router.post("/suspend", verifyToken, checkUser, isAdmin, suspendBusiness);

// category routes
router.post("/list", getCategories);
router.post("/sub-categories/list", getSubCategories);
router.post(
  "/create",
  verifyToken,
  checkUser,
  isAdmin,
  upload.single("category_image"),
  createCategory,
);
router.post(
  "/sub-categories/create",
  verifyToken,
  checkUser,
  isAdmin,
  upload.single("subcategory_image"),
  createSubCategory,
);
router.post(
  "/update",
  verifyToken,
  checkUser,
  isAdmin,
  upload.single("category_image"),
  updateCategory,
);
router.post(
  "/sub-categories/update",
  verifyToken,
  checkUser,
  isAdmin,
  upload.single("subcategory_image"),
  updateSubCategory,
);

// city routes
router.post("/list", getActiveCities);
router.post("/create", verifyToken, checkUser, isAdmin, createCity);
router.post("/getallcities", verifyToken, checkUser, isAdmin, getAllCities);
router.post("/getcitybyid", verifyToken, checkUser, isAdmin, getCityById);
router.post("/update", verifyToken, checkUser, isAdmin, updateCity);
router.post("/updatecitybyid", verifyToken, checkUser, isAdmin, updateCity);
router.post("/deletecitybyid", verifyToken, checkUser, isAdmin, deleteCity);

// notification routes
router.post("/create", verifyToken, checkUser, isAdmin, createNotification);

// reports routes
router.post(
  "/business/list",
  verifyToken,
  checkUser,
  isAdmin,
  getBusinessReports,
);
router.post("/", verifyToken, checkUser, isAdmin, getAllReports);
router.post("/status", verifyToken, checkUser, isAdmin, updateReportStatus);
router.post("/approvereport", verifyToken, checkUser, isAdmin, approveReport);
router.post("/rejectreport", verifyToken, checkUser, isAdmin, rejectReport);
router.post("/getreportbyid", verifyToken, checkUser, isAdmin, getReportById);

// review routes
router.post("/business/list", getBusinessReviews);
router.post("/status", verifyToken, checkUser, isAdmin, updateReviewStatus);

// verification routes
router.post(
  "/list",
  verifyToken,
  checkUser,
  isVerifier,
  getVerificationBusinesses,
);
router.post("/approve", verifyToken, checkUser, isVerifier, approveBusiness);
router.post("/reject", verifyToken, checkUser, isVerifier, rejectBusiness);
router.post(
  "/history",
  verifyToken,
  checkUser,
  isVerifier,
  getVerificationHistory,
);

module.exports = router;
