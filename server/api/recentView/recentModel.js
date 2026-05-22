const mongoose = require("mongoose");

const recentViewSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    business_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    view_at: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: true },
);

recentViewSchema.index({ user_id: 1, business_id: 1 }, { unique: true });

const RecentView = mongoose.model("RecentView", recentViewSchema);
module.exports = RecentView;
