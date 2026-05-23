const mongoose = require("mongoose");

const adminActivitySchema = new mongoose.Schema(
  {
    admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    resource: {
      type: String,
      required: true,
      trim: true,
    },
    resource_id: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "resource_model",
    },
    resource_model: {
      type: String,
      default: "User",
    },
    details: {
      type: Object,
      default: {},
    },
    route: {
      type: String,
      default: "",
    },
    method: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

adminActivitySchema.index({ admin_id: 1, createdAt: -1 });

const AdminActivity = mongoose.model("AdminActivity", adminActivitySchema);

module.exports = AdminActivity;
