const mongoose = require("mongoose");
const Business = require("../business/businessModel");
const { Review, ReviewVote } = require("./reviewModel");
const path = require("path");
const { createUserNotification } = require("../../utils/notify");
const { deleteFile } = require("../../middleware/upload");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const REVIEW_SORT = {
  latest: { createdAt: -1 },
  highest: { rating: -1, createdAt: -1 },
  helpful: { helpful_count: -1, createdAt: -1 },
};

const refreshBusinessRating = async (businessId) => {
  const stats = await Review.aggregate([
    {
      $match: {
        business_id: new mongoose.Types.ObjectId(businessId),
        status: "approved",
      },
    },
    {
      $group: {
        _id: "$business_id",
        rating: { $avg: "$rating" },
        total_reviews: { $sum: 1 },
      },
    },
  ]);

  const rating = stats[0]?.rating || 0;
  const totalReviews = stats[0]?.total_reviews || 0;

  await Business.findByIdAndUpdate(businessId, {
    rating: Number(rating.toFixed(1)),
    total_reviews: totalReviews,
  });
};

const addReview = async (req, res) => {
  try {
    const businessId = req.body.businessId;
    const { rating, comment } = req.body;

    // Handle uploaded review images
    const review_images = req.files
      ? req.files.map((file) =>
          path
            .join("uploads", "review-images", file.filename)
            .replace(/\\/g, "/"),
        )
      : [];

    // Validate business ID
    if (!businessId || !isValidId(businessId)) {
      return res.status(400).json({
        message: "Invalid business id",
      });
    }

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        message: "Rating must be between 1 and 5",
      });
    }

    // Validate comment
    if (!comment) {
      return res.status(400).json({
        message: "Comment is required",
      });
    }

    // Check if business exists
    const business = await Business.findById(businessId);

    if (!business) {
      return res.status(404).json({
        message: "Business not found",
      });
    }

    // Check if business is active
    if (!business.is_active) {
      return res.status(400).json({
        message: "Business is inactive",
      });
    }

    // Optional: Allow reviews only for verified businesses
    if (business.verified_status !== "verified") {
      return res.status(400).json({
        message: "Only verified businesses can receive reviews",
      });
    }

    // Create review
    const review = await Review.create({
      business_id: businessId,
      user_id: req.dbUser._id,
      rating,
      comment,
      review_images,
    });

    // Add review to business
    await Business.findByIdAndUpdate(businessId, {
      $addToSet: { reviews: review._id },
    });

    // Refresh average rating
    await refreshBusinessRating(businessId);

    await createUserNotification(
      business.owner_id,
      "New review received",
      `${req.dbUser.name || "Someone"} left a ${rating}★ review on ${business.name}`,
      "new_review",
    );

    return res.status(201).json({
      message: "Review added successfully",
      review,
    });

  } catch (error) {
    console.error("[addReview]", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "You have already reviewed this business",
      });
    }

    return res.status(500).json({
      message: `Internal server error: ${error.message}`,
    });
  }
};

const editReview = async (req, res) => {
  try {
    const reviewId = req.body.reviewId;
    const { rating, comment } = req.body;

    // Handle uploaded new review images
    const newReviewImages = req.files
      ? req.files.map((file) =>
          path
            .join("uploads", "review-images", file.filename)
            .replace(/\\/g, "/"),
        )
      : [];

    if (!reviewId || !isValidId(reviewId)) {
      return res.status(400).json({ message: "Invalid reviewId" });
    }

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        message: "Rating must be between 1 and 5",
      });
    }

    const review = await Review.findOne({
      _id: reviewId,
      user_id: req.dbUser._id,
    });

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (rating !== undefined) review.rating = rating;
    if (comment !== undefined) review.comment = comment;
    review.status = "pending";

    // delete old and append new images
    if (newReviewImages.length) {
      if (review.review_images?.length) {
        review.review_images.forEach((img) => deleteFile(img));
      }
      review.review_images = newReviewImages;
    }

    await review.save();
    await refreshBusinessRating(review.business_id);

    return res.status(200).json({
      message: "Review updated successfully and is pending admin approval",
      review,
    });
  } catch (error) {
    console.error("[editReview]", error);

    return res.status(500).json({
      message: `Internal server error: ${error.message}`,
    });
  }
};

const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.body;

    if (!isValidId(reviewId)) {
      return res.status(400).json({ message: "Invalid review id" });
    }

    const review = await Review.findOneAndDelete({
      _id: reviewId,
      user_id: req.dbUser._id,
    });
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    //  delete image
    if (review.review_images?.length) {
      review.review_images.forEach((img) => deleteFile(img));
    }

    await ReviewVote.deleteMany({ review_id: reviewId });
    await Business.findByIdAndUpdate(review.business_id, {
      $pull: { reviews: review._id },
    });
    await refreshBusinessRating(review.business_id);

    return res.status(200).json({ message: "Review deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getMyReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.body;

    const reviews = await Review.find({ user_id: req.dbUser._id })
      .populate("business_id", "name slug logo city rating")
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Review.countDocuments({ user_id: req.dbUser._id });

    return res.status(200).json({
      reviews,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getBusinessReviews = async (req, res) => {
  try {
    const { businessId } = req.body;
    const body = req.body;
    const { status = "approved", sort = "latest", page = 1, limit = 20 } = body;

    if (!isValidId(businessId)) {
      return res.status(400).json({ message: "Invalid business id" });
    }

    const filter = { business_id: businessId };
    if (status) filter.status = status;

    const sortKey = REVIEW_SORT[sort] ? sort : "latest";

    const reviews = await Review.find(filter)
      .populate("user_id", "name profile_image")
      .sort(REVIEW_SORT[sortKey])
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Review.countDocuments(filter);

    return res.status(200).json({
      reviews,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const replyToReview = async (req, res) => {
  try {
    const { reviewId, message } = req.body;

    if (!isValidId(reviewId)) {
      return res.status(400).json({ message: "Invalid review id" });
    }
    if (!message) {
      return res.status(400).json({ message: "Reply message is required" });
    }

    const review = await Review.findById(reviewId).populate("business_id");
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    const ownsBusiness =
      review.business_id.owner_id.toString() === req.dbUser._id.toString();
    if (!ownsBusiness && req.dbUser.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Not allowed to reply to this review" });
    }

    review.owner_reply = { message, replied_at: new Date() };
    await review.save();

    await createUserNotification(
      review.user_id,
      "Response to your review",
      `${review.business_id.name} replied to your review`,
      "review_reply",
    );

    return res
      .status(200)
      .json({ message: "Reply added successfully", review });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const voteReview = async (req, res) => {
  try {
    const { reviewId, type } = req.body;

    if (!isValidId(reviewId)) {
      return res.status(400).json({ message: "Invalid review id" });
    }
    if (!["helpful", "unhelpful"].includes(type)) {
      return res
        .status(400)
        .json({ message: "Vote type must be helpful or unhelpful" });
    }

    const existingVote = await ReviewVote.findOne({
      review_id: reviewId,
      user_id: req.dbUser._id,
    });

    if (existingVote && existingVote.type === type) {
      return res.status(409).json({ message: "Review already voted" });
    }

    if (existingVote) {
      await Review.findByIdAndUpdate(reviewId, {
        $inc: {
          [`${existingVote.type}_count`]: -1,
          [`${type}_count`]: 1,
        },
      });
      existingVote.type = type;
      await existingVote.save();
      return res.status(200).json({ message: "Review vote updated" });
    }

    await ReviewVote.create({
      review_id: reviewId,
      user_id: req.dbUser._id,
      type,
    });
    await Review.findByIdAndUpdate(reviewId, {
      $inc: { [`${type}_count`]: 1 },
    });

    return res.status(201).json({ message: "Review vote added" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updateReviewStatus = async (req, res) => {
  try {
    const { reviewId, status } = req.body;

    if (!isValidId(reviewId)) {
      return res.status(400).json({ message: "Invalid review id" });
    }
    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ message: "Invalid review status" });
    }

    const review = await Review.findByIdAndUpdate(
      reviewId,
      { status },
      { new: true },
    );
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    await refreshBusinessRating(review.business_id);

    return res.status(200).json({ message: "Review status updated", review });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  addReview,
  editReview,
  deleteReview,
  getMyReviews,
  getBusinessReviews,
  replyToReview,
  voteReview,
  updateReviewStatus,
};
