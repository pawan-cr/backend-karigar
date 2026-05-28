const Banner = require("./bannerModel");
const path = require("path");
const {
  logAdminActivity,
} = require("../adminActivity/adminActivityController");
const { deleteFile } = require("../../middleware/upload");

const getActiveBanners = async (req, res) => {
  try {
    const banners = await Banner.find({ status: "active" }).sort({
      createdAt: -1,
    });
    return res.status(200).json({ banners });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const createBanner = async (req, res) => {
  try {
    const { title, redirect_url, status } = req.body;
    let banner_image;
    if (req.file) {
      banner_image = path
        .join("uploads", "banner-images", req.file.filename)
        .replace(/\\/g, "/");
    }
    const banner = await Banner.create({
      title,
      banner_image,
      redirect_url,
      status,
    });
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

    // path of the old image
    const existing = await Banner.findById(bannerId);
    if (!existing) return res.status(404).json({ message: "Banner not found" });

    // delete old image if new one uploaded
    if (req.file && existing.banner_image) {
      deleteFile(existing.banner_image);
    }

    const banner_image = req.file
      ? path
          .join("uploads", "banner-images", req.file.filename)
          .replace(/\\/g, "/")
      : undefined;

    const banner = await Banner.findByIdAndUpdate(
      bannerId,
      { ...req.body, ...(banner_image && { banner_image }) },
      { new: true, runValidators: true },
    );

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
