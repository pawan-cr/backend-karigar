const mongoose = require("mongoose");

const analyticsSchema = new mongoose.Schema(
  {
    business_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    profile_views: {
      type: Number,
      default: 0,
    },
    call_click: {
      type: Number,
      default: 0,
    },
    whatsapp_click: {
      type: Number,
      default: 0,
    },
    website_click: {
      type: Number,
      default: 0,
    },
    maps_click: {
      type: Number,
      default: 0,
    },
    date: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  { timestamps: true },
);

const Analytics = mongoose.model("Analytics", analyticsSchema);
module.exports = Analytics;
