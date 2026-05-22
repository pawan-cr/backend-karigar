const mongoose = require("mongoose");
const Favourite = require("./favouriteModel");
const Business = require("../business/businessModel");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const getMyFavourites = async (req, res) => {
  try {
    const favourites = await Favourite.find({ user_id: req.dbUser._id })
      .populate({
        path: "business_id",
        match: { verified_status: "verified", is_active: true },
        populate: [
          { path: "category", select: "name image icon" },
          { path: "sub_category", select: "name image icon" },
        ],
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      favourites: favourites.filter((f) => f.business_id),
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const saveFavourite = async (req, res) => {
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

    const favourite = await Favourite.findOneAndUpdate(
      { user_id: req.dbUser._id, business_id: businessId },
      {},
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return res.status(201).json({
      message: "Business saved to favourites",
      favourite,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const removeFavourite = async (req, res) => {
  try {
    const { businessId } = req.body;

    if (!isValidId(businessId)) {
      return res.status(400).json({ message: "Invalid business id" });
    }

    const favourite = await Favourite.findOneAndDelete({
      user_id: req.dbUser._id,
      business_id: businessId,
    });

    if (!favourite) {
      return res.status(404).json({ message: "Favourite not found" });
    }

    return res.status(200).json({ message: "Favourite removed" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { getMyFavourites, saveFavourite, removeFavourite };
