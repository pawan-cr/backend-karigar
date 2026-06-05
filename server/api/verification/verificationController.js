const Business = require("../business/businessModel");
const Verification = require("./verificationModel");
const mongoose = require("mongoose");
const { createUserNotification } = require("../../utils/notify");
const { logAdminActivity } = require("../adminActivity/adminActivityController");

const isValidBusinessId = (businessId) =>
  mongoose.Types.ObjectId.isValid(businessId);
const VERIFICATION_STATUSES = ["pending", "verified", "rejected"];

const getVerificationBusinesses = async (req, res) => {
  try {
    const {
      status = "pending",
      city,
      category,
      search,
      page = 1,
      limit = 20,
    } = req.body;

    const verificationStatus = status.toString().toLowerCase();
    if (!VERIFICATION_STATUSES.includes(verificationStatus)) {
      return res.status(400).json({
        message: "Status must be pending, verified, or rejected",
      });
    }

    const filter = { verified_status: verificationStatus };
    if (verificationStatus !== "rejected") {
      filter.is_active = true;
    }

    if (city) filter.city = new RegExp(city, "i");
    if (category) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({ message: "Invalid category id" });
      }
      filter.category = category;
    }
    if (search) {
      filter.$text = { $search: search };
    }

    const businesses = await Business.find(filter)
      .populate("owner_id", "name email phone")
      .populate("category", "name image icon")
      .populate("sub_category", "name image icon")
      .populate("verified_by", "name email role")
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Business.countDocuments(filter);

    let businessesData = businesses.map(b => b.toObject());

    if (verificationStatus === "pending") {
      businessesData = await Promise.all(
        businessesData.map(async (b) => {
          const latestPending = await Verification.findOne({
            business_id: b._id,
            action: "pending",
          }).sort({ createdAt: -1 });

          if (latestPending && latestPending.previous_state) {
            b.previous_state = latestPending.previous_state;
          }
          return b;
        })
      );
    }

    return res.status(200).json({
      businesses: businessesData,
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

const approveBusiness = async (req, res) => {
  try {
    const { businessId } = req.body;

    if (!isValidBusinessId(businessId)) {
      return res.status(400).json({ message: "Invalid business id" });
    }

    const business = await Business.findById(businessId);

    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    if (business.verified_status === "verified") {
      return res.status(400).json({ message: "Business is already verified" });
    }

    business.verified_status = "verified";
    business.verified_by = req.dbUser._id;
    business.reject_reason = undefined;
    business.is_active = true;
    await business.save();

    await Verification.create({
      business_id: business._id,
      manager_id: req.dbUser._id,
      action: "approved",
    });

    await createUserNotification(
      business.owner_id,
      "Business verified",
      `${business.name} has been verified and is now live.`,
      "verification_approved",
    );
    await logAdminActivity(req, {
      action: "approve_business",
      resource: "business",
      resource_id: business._id,
      resource_model: "Business",
      details: { businessId, action: "approved" },
    });

    return res.status(200).json({
      message: "Business approved successfully",
      business,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const rejectBusiness = async (req, res) => {
  try {
    const { businessId, reason } = req.body;

    if (!isValidBusinessId(businessId)) {
      return res.status(400).json({ message: "Invalid business id" });
    }

    if (!reason) {
      return res.status(400).json({ message: "Rejection reason is required" });
    }

    const business = await Business.findById(businessId);

    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    if (business.verified_status === "rejected") {
      return res.status(400).json({ message: "Business is already rejected" });
    }

    business.verified_status = "rejected";
    business.verified_by = req.dbUser._id;
    business.reject_reason = reason;
    await business.save();

    await Verification.create({
      business_id: business._id,
      manager_id: req.dbUser._id,
      action: "rejected",
      reason,
    });

    await createUserNotification(
      business.owner_id,
      "Business rejected",
      `${business.name} was rejected: ${reason}`,
      "verification_rejected",
    );
    await logAdminActivity(req, {
      action: "reject_business",
      resource: "business",
      resource_id: business._id,
      resource_model: "Business",
      details: { businessId, reason, action: "rejected" },
    });

    return res.status(200).json({
      message: "Business rejected successfully",
      business,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getVerificationHistory = async (req, res) => {
  try {
    const { businessId } = req.body;

    if (!isValidBusinessId(businessId)) {
      return res.status(400).json({ message: "Invalid business id" });
    }

    const verifications = await Verification.find({ business_id: businessId })
      .populate("manager_id", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({ verifications });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  getVerificationBusinesses,
  approveBusiness,
  rejectBusiness,
  getVerificationHistory,
};
