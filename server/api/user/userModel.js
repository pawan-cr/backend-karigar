const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    firebase_uid: {
      type: String,
      required: true,
      // unique: true,
    },
    name: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      lowercase: true,
      unique: true,
      sparse: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    profile_image: {
      type: String,
      // required: true,
      default: "",
    },
    role: {
      type: String,
      enum: ["user", "businessOwner", "manager", "admin", "both"],
      default: "user",
      required: true,
    },
    is_blocked: {
      type: Boolean,
      default: false,
    },
    fcm_token: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", UserSchema);

module.exports = User;
