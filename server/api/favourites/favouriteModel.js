const mongoose = require("mongoose");

const favouriteSchema = new mongoose.Schema(
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
  },
  { timestamps: true },
);

favouriteSchema.index({ user_id: 1, business_id: 1 }, { unique: true });

const Favourite = mongoose.model("Favourite", favouriteSchema);
module.exports = Favourite;
