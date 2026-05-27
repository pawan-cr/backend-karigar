const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
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
const { replyToReview } = require("../api/review/reviewController");
const {
  getBusinessAnalytics,
} = require("../api/businessAnalytics/analyticsController");

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

// Analytics routes
router.post(
  "/analytics/business",
  verifyToken,
  checkUser,
  isBusinessOwner,
  getBusinessAnalytics,
);

module.exports = router;
