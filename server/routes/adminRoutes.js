const express = require("express");
const router = express.Router();
const { upload, deleteFile } = require("../middleware/upload");
const {
  verifyToken,
  checkUser,
  isAdmin,
  isVerifier,
  optionalCheckUser,
} = require("../middleware/auth.middleware");

const {
  getAllUsers,
  blockUser,
  changeUserRole,
} = require("../api/auth/auth.controller");
const { adminSearch } = require("../search/searchController");

const {
  suspendBusiness,
  getApprovedBusinesses,
  getBusinessDetails,
  trackBusinessAction,
  getAdminBusinesses,
} = require("../api/business/businessController");
const {
  getVerificationBusinesses,
  approveBusiness,
  rejectBusiness,
  getVerificationHistory,
} = require("../api/verification/verificationController");
const {
  createCategory,
  updateCategory,
  createSubCategory,
  updateSubCategory,
  getCategories,
  getSubCategories,
} = require("../api/category/categoryController");
const {
  createCity,
  updateCity,
  getActiveCities,
  getAllCities,
  getCityById,
  deleteCity,
} = require("../api/cities/citiesController");
const {
  createBanner,
  updateBanner,
  getActiveBanners,
} = require("../api/banner/bannerController");
const {
  getAllReports,
  updateReportStatus,
  getBusinessReports,
  approveReport,
  rejectReport,
  getReportById,
} = require("../api/reports/reportController");
const {
  updateReviewStatus,
  getBusinessReviews,
} = require("../api/review/reviewController");
const {
  getAdminDashboard,
  getAdminActivityLog,
} = require("../api/businessAnalytics/analyticsController");
const {
  createNotification,
} = require("../api/notification/notificationController");
const {
  getRecentViews,
  addRecentView,
} = require("../api/recentView/recentController");

// User routes
router.post("/users/list", verifyToken, checkUser, isAdmin, getAllUsers);
router.post("/users/block", verifyToken, checkUser, isAdmin, blockUser);
router.post("/users/role", verifyToken, checkUser, isAdmin, changeUserRole);
router.post("/search", verifyToken, checkUser, isAdmin, adminSearch);

// Business routes
router.post(
  "/business/suspend",
  verifyToken,
  checkUser,
  isAdmin,
  suspendBusiness,
);
router.post(
  "/business/list",
  verifyToken,
  checkUser,
  isAdmin,
  getAdminBusinesses,
);
// router.post("/details", optionalCheckUser, getBusinessDetails);
// router.post("/track", trackBusinessAction);

// Verification routes
router.post(
  "/verification/list",
  verifyToken,
  checkUser,
  isVerifier,
  getVerificationBusinesses,
);
router.post(
  "/verification/approve",
  verifyToken,
  checkUser,
  isVerifier,
  approveBusiness,
);
router.post(
  "/verification/reject",
  verifyToken,
  checkUser,
  isVerifier,
  rejectBusiness,
);
router.post(
  "/verification/history",
  verifyToken,
  checkUser,
  isVerifier,
  getVerificationHistory,
);

// Categories routes
// router.post("/categories/list", getCategories);
// router.post("/categories/sub-categories/list", getSubCategories);

router.post(
  "/categories/create",
  verifyToken,
  checkUser,
  isAdmin,
  upload.single("category_image"),
  createCategory,
);
router.post(
  "/categories/update",
  verifyToken,
  checkUser,
  isAdmin,
  upload.single("category_image"),
  updateCategory,
);
router.post(
  "/categories/sub-categories/create",
  verifyToken,
  checkUser,
  isAdmin,
  upload.single("subcategory_image"),
  createSubCategory,
);
router.post(
  "/categories/sub-categories/update",
  verifyToken,
  checkUser,
  isAdmin,
  upload.single("subcategory_image"),
  updateSubCategory,
);

// Cities routes
// router.post("/cities/list", getActiveCities);
router.post("/cities/create", verifyToken, checkUser, isAdmin, createCity);
router.post("/cities/update", verifyToken, checkUser, isAdmin, updateCity);
router.post("/cities/getall", verifyToken, checkUser, isAdmin, getAllCities);
router.post("/cities/getsingle", verifyToken, checkUser, isAdmin, getCityById);
router.post("/cities/delete", verifyToken, checkUser, isAdmin, deleteCity);

// Banners routes
// router.post("/list", getActiveBanners);
router.post(
  "/banners/create",
  verifyToken,
  checkUser,
  isAdmin,
  upload.single("banner_image"),
  createBanner,
);
router.post("/banners/update", verifyToken, checkUser, isAdmin, updateBanner);

// Reports routes
router.post("/reports/list", verifyToken, checkUser, isAdmin, getAllReports);
router.post(
  "/reports/status",
  verifyToken,
  checkUser,
  isAdmin,
  updateReportStatus,
);
router.post(
  "/reports/business/list",
  verifyToken,
  checkUser,
  isAdmin,
  getBusinessReports,
);
// router.post("/reports/approve", verifyToken, checkUser, isAdmin, approveReport);
// router.post("/reports/reject", verifyToken, checkUser, isAdmin, rejectReport);
// router.post(
//   "/reports/getsingle",
//   verifyToken,
//   checkUser,
//   isAdmin,
//   getReportById,
// );

// Reviews routes
router.post(
  "/reviews/status",
  verifyToken,
  checkUser,
  isAdmin,
  updateReviewStatus,
);
// router.post("/reviews/business/list", getBusinessReviews);

// Analytics routes
router.post(
  "/analytics/dashboard",
  verifyToken,
  checkUser,
  isAdmin,
  getAdminDashboard,
);
router.post(
  "/analytics/activity-log",
  verifyToken,
  checkUser,
  isAdmin,
  getAdminActivityLog,
);

// Notifications routes
router.post(
  "/notifications/create",
  verifyToken,
  checkUser,
  isAdmin,
  createNotification,
);

// Recent routes
// router.post("/recent/list", verifyToken, checkUser, getRecentViews);
// router.post("/recents/add", verifyToken, checkUser, addRecentView);

module.exports = router;
