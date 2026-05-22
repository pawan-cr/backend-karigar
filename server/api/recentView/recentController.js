const mongoose = require("mongoose");
const Business = require("../business/businessModel");
const RecentView = require("./recentModel");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const addRecentView = async (req, res) => {
  try {
    const { businessId } = req.body;

    if (!isValidId(businessId)) {
      return res.status(400).json({ message: "Invalid business id" });
    }

    const business = await Business.findOne({
      _id: businessId,
      verified_status: "verified",
      is_active: true,
    });
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    const recentView = await RecentView.findOneAndUpdate(
      { user_id: req.dbUser._id, business_id: businessId },
      { view_at: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return res.status(201).json({ message: "Recent view saved", recentView });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getRecentViews = async (req, res) => {
  try {
    const recentViews = await RecentView.find({ user_id: req.dbUser._id })
      .populate({
        path: "business_id",
        match: { verified_status: "verified", is_active: true },
        populate: { path: "category", select: "name image icon" },
      })
      .sort({ view_at: -1 })
      .limit(20);

    return res.status(200).json({
      recentViews: recentViews.filter((item) => item.business_id),
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { addRecentView, getRecentViews };
