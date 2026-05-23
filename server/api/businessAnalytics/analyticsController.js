const Business = require("../business/businessModel");
const User = require("../user/userModel");
const Category = require("../category/categoryModel");
const City = require("../cities/citiesModel");
const { Review } = require("../review/reviewModel");
const Analytics = require("./analyticsModel");
const AdminActivity = require("../adminActivity/adminActivityModel");

const getAdminDashboard = async (req, res) => {
  try {
    const [
      totalUsers,
      totalOwners,
      totalManagers,
      totalBusinesses,
      pendingBusinesses,
      verifiedBusinesses,
      rejectedBusinesses,
      totalReviews,
      categoryDistribution,
      cityDistribution,
    ] = await Promise.all([
      User.countDocuments({ role: "user" }),
      User.countDocuments({ role: "businessOwner" }),
      User.countDocuments({ role: "manager" }),
      Business.countDocuments(),
      Business.countDocuments({ verified_status: "pending" }),
      Business.countDocuments({ verified_status: "verified" }),
      Business.countDocuments({ verified_status: "rejected" }),
      Review.countDocuments(),
      Business.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
      Business.aggregate([
        { $match: { city: { $exists: true, $ne: "" } } },
        { $group: { _id: "$city", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
    ]);

    const categories = await Category.find().select("name");
    const categoryMap = Object.fromEntries(
      categories.map((c) => [c._id.toString(), c.name]),
    );

    const categorySeries = categoryDistribution.map((item) => ({
      categoryId: item._id,
      categoryName: categoryMap[item._id?.toString()] || "Unknown",
      count: item.count,
    }));

    const citySeries = cityDistribution.map((item) => ({
      city: item._id,
      count: item.count,
    }));

    const activeCities = await City.countDocuments({ status: "active" });

    return res.status(200).json({
      stats: {
        totalUsers,
        totalOwners,
        totalManagers,
        totalBusinesses,
        pendingBusinesses,
        verifiedBusinesses,
        rejectedBusinesses,
        totalReviews,
        activeCities,
      },
      charts: {
        categoryDistribution: categorySeries,
        cityWiseGrowth: citySeries,
        verificationBreakdown: {
          pending: pendingBusinesses,
          verified: verifiedBusinesses,
          rejected: rejectedBusinesses,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getAdminActivityLog = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.body;

    const logs = await AdminActivity.find()
      .populate("admin_id", "name email profile_image role")
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await AdminActivity.countDocuments();

    return res.status(200).json({
      logs,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getBusinessAnalytics = async (req, res) => {
  try {
    const { businessId } = req.body;
    const business = await Business.findById(businessId);

    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }
    if (
      business.owner_id.toString() !== req.dbUser._id.toString() &&
      req.dbUser.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not allowed to view analytics" });
    }

    const analytics = await Analytics.find({ business_id: businessId }).sort({
      date: -1,
    });

    return res.status(200).json({
      business: {
        views: business.views,
        call_click: business.call_click,
      whatsapp_click: business.whatsapp_click,
        website_click: business.website_click,
      },
      analytics,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { getAdminDashboard, getBusinessAnalytics, getAdminActivityLog };
