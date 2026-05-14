const mongoose = require("mongoose");

const User = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: "ADMIN" | "BUSINESS-OWNER" | "USER",
      default: "USER",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    profileImg: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", User);

module.exports = User;
