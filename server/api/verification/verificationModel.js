const mongoose = require("mongoose");

const verificationSchema = new mongoose.Schema(
  {
    business_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    manager_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required() {
        return this.action !== "pending";
      },
    },
    action: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reason: {
      type: String,
    },
    previous_state: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true },
);

const Verification = mongoose.model("Verification", verificationSchema);
module.exports = Verification;
