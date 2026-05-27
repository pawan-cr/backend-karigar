const express = require("express");
const router = express.Router();
const {
  verifyToken,
  checkUser,
  isAdmin,
  isBusinessOwner,
} = require("../middleware/auth.middleware");
const {
  addReview,
  editReview,
  deleteReview,
  getMyReviews,
  getBusinessReviews,
  replyToReview,
  voteReview,
  updateReviewStatus,
} = require("../api/review/reviewController");
const upload = require("../middleware/upload")

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

router.post("/reply", verifyToken, checkUser, isBusinessOwner, replyToReview);

router.post("/status", verifyToken, checkUser, isAdmin, updateReviewStatus);

module.exports = router;
