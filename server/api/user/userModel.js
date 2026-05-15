const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    firebase_uid: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      lowercase: true,
      unique: true,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      unique: true,
      default: "",
    },
    profile_image: {
      type: String,
      required: true,
      default: "",
    },
    role: {
      type: String,
      enum: ["user", "businessOwner", "admin"],
      default: "user",
      required: true,
    },
    is_blocked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", UserSchema);

module.exports = User;
