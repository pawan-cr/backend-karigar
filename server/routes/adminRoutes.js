const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const {
  verifyToken,
  checkUser,
  isAdmin,
  isVerifier,
} = require("../middleware/auth.middleware");

const {
  getAllUsers,
  blockUser,
  changeUserRole,
  searchAdmin,
} = require("../api/auth/auth.controller");

const { suspendBusiness } = require("../api/business/businessController");
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
} = require("../api/category/categoryController");
const { createCity, updateCity } = require("../api/cities/citiesController");
const {
  createBanner,
  updateBanner,
} = require("../api/banner/bannerController");
const {
  getAllReports,
  updateReportStatus,
  getBusinessReports,
} = require("../api/reports/reportController");
const { updateReviewStatus } = require("../api/review/reviewController");
const {
  getAdminDashboard,
  getAdminActivityLog,
} = require("../api/businessAnalytics/analyticsController");
const {
  createNotification,
} = require("../api/notification/notificationController");

// User routes
router.post("/users/list", verifyToken, checkUser, isAdmin, getAllUsers);
router.post("/users/search", verifyToken, checkUser, isAdmin, searchAdmin);
router.post("/users/block", verifyToken, checkUser, isAdmin, blockUser);
router.post("/users/role", verifyToken, checkUser, isAdmin, changeUserRole);

// Business routes
router.post(
  "/business/suspend",
  verifyToken,
  checkUser,
  isAdmin,
  suspendBusiness,
);

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
router.post("/cities/create", verifyToken, checkUser, isAdmin, createCity);
router.post("/cities/update", verifyToken, checkUser, isAdmin, updateCity);

// Banners routes
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

// Reviews routes
router.post(
  "/reviews/status",
  verifyToken,
  checkUser,
  isAdmin,
  updateReviewStatus,
);

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

module.exports = router;
