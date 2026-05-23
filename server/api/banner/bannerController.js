const Banner = require("./bannerModel");
const { logAdminActivity } = require("../adminActivity/adminActivityController");

const getActiveBanners = async (req, res) => {
  try {
    const banners = await Banner.find({ status: "active" }).sort({ createdAt: -1 });
    return res.status(200).json({ banners });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const createBanner = async (req, res) => {
  try {
    const { title, image, redirect_url, status } = req.body;
    if (!title || !image) {
      return res.status(400).json({ message: "Title and image are required" });
    }

    const banner = await Banner.create({ title, image, redirect_url, status });
    await logAdminActivity(req, {
      action: "create_banner",
      resource: "banner",
      resource_id: banner._id,
      resource_model: "Banner",
      details: { title, status },
    });
    return res.status(201).json({ message: "Banner created", banner });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updateBanner = async (req, res) => {
  try {
    const { bannerId } = req.body;
    const banner = await Banner.findByIdAndUpdate(bannerId, req.body, {
      new: true,
      runValidators: true,
    });
    if (!banner) {
      return res.status(404).json({ message: "Banner not found" });
    }

    await logAdminActivity(req, {
      action: "update_banner",
      resource: "banner",
      resource_id: banner._id,
      resource_model: "Banner",
      details: { bannerId, updates: req.body },
    });

    return res.status(200).json({ message: "Banner updated", banner });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { getActiveBanners, createBanner, updateBanner };
