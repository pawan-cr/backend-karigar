const mongoose = require("mongoose");

const businessSchema = new mongoose.Schema(
  {
    owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    sub_category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
      required: true,
    },

    description: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
      // unique: true,
    },
    whatsapp: {
      type: String,
    },
    website: {
      type: String,
    },
    email: {
      type: String,
    },
    address: {
      type: String,
    },
    city: {
      type: String,
    },
    state: {
      type: String,
    },
    country: {
      type: String,
    },
    pincode: {
      type: String,
    },
    coordinates: {
      latitude: Number,
      longitude: Number,
    },
    timing: [
      {
        day: String,
        open: String,
        close: String,
      },
    ],
    services: [{ type: String }],
    logo: {
      type: String,
    },
    business_images: [{ type: String }],
    rating: {
      type: Number,
      default: 0,
    },
    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Review",
      },
    ],
    total_reviews: {
      type: Number,
      default: 0,
    },
    verified_status: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    verified_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reject_reason: {
      type: String,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    views: {
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
  },
  {
    timestamps: true,
  },
);

businessSchema.index({
  name: "text",
  description: "text",
  services: "text",
  city: "text",
});

businessSchema.index({ owner_id: 1 });
businessSchema.index({ category: 1, sub_category: 1 });
businessSchema.index({ verified_status: 1, is_active: 1 });
businessSchema.index({ "coordinates.latitude": 1, "coordinates.longitude": 1 });

const Business = mongoose.model("Business", businessSchema);
module.exports = Business;
