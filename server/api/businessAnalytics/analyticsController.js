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

// const getBusinessAnalytics = async (req, res) => {
//   try {
//     const { businessId } = req.body;
//     const business = await Business.findById(businessId);

//     if (!business) {
//       return res.status(404).json({ message: "Business not found" });
//     }
//     if (
//       business.owner_id.toString() !== req.dbUser._id.toString() &&
//       req.dbUser.role !== "admin"
//     ) {
//       return res.status(403).json({ message: "Not allowed to view analytics" });
//     }

//     const analytics = await Analytics.find({ business_id: businessId }).sort({
//       date: -1,
//     });

//     return res.status(200).json({
//       business: {
//         views: business.views,
//         call_click: business.call_click,
//       whatsapp_click: business.whatsapp_click,
//         website_click: business.website_click,
//       },
//       analytics,
//     });
//   } catch (error) {
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

const getBusinessAnalytics = async (req, res) => {
  try {
    // fetch all businesses owned by this user
    const businesses = await Business.find({ owner_id: req.dbUser._id }).select(
      "name slug logo views call_click whatsapp_click website_click maps_click rating total_reviews verified_status is_active",
    );

    if (!businesses.length) {
      return res.status(404).json({ message: "No businesses found" });
    }

    const businessIds = businesses.map((b) => b._id);

    // fetch daily analytics for all their businesses
    const analytics = await Analytics.find({
      business_id: { $in: businessIds },
    }).sort({ date: -1 });

    const analyticsByBusiness = {};
    analytics.forEach((entry) => {
      const id = entry.business_id.toString();
      if (!analyticsByBusiness[id]) analyticsByBusiness[id] = [];
      analyticsByBusiness[id].push(entry);
    });

    const businessSummaries = businesses.map((b) => ({
      businessId: b._id,
      name: b.name,
      slug: b.slug,
      logo: b.logo,
      verified_status: b.verified_status,
      is_active: b.is_active,
      rating: b.rating,
      total_reviews: b.total_reviews,
      totals: {
        views: b.views,
        call_click: b.call_click,
        whatsapp_click: b.whatsapp_click,
        website_click: b.website_click,
        maps_click: b.maps_click || 0,
      },
      daily_analytics: analyticsByBusiness[b._id.toString()] || [],
    }));

    const overall = businesses.reduce(
      (acc, b) => {
        acc.views += b.views || 0;
        acc.call_click += b.call_click || 0;
        acc.whatsapp_click += b.whatsapp_click || 0;
        acc.website_click += b.website_click || 0;
        acc.maps_click += b.maps_click || 0;
        return acc;
      },
      {
        views: 0,
        call_click: 0,
        whatsapp_click: 0,
        website_click: 0,
        maps_click: 0,
      },
    );

    // Fetch reviews for all businesses owned by this user
    const reviews = await Review.find({ business_id: { $in: businessIds } })
      .populate("user_id", "name profile_image")
      .populate("business_id", "name")
      .sort({ createdAt: -1 });

    const totalReviews = reviews.length;
    const distributionMap = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sumRatings = 0;
    reviews.forEach((r) => {
      const stars = Math.round(r.rating);
      if (distributionMap[stars] !== undefined) {
        distributionMap[stars]++;
      }
      sumRatings += r.rating;
    });

    const overallRating = totalReviews > 0 ? Number((sumRatings / totalReviews).toFixed(1)) : 0;

    const distribution = [
      { stars: 5, count: distributionMap[5], label: "Superb" },
      { stars: 4, count: distributionMap[4], label: "Good" },
      { stars: 3, count: distributionMap[3], label: "Average" },
      { stars: 2, count: distributionMap[2], label: "Below Avg" },
      { stars: 1, count: distributionMap[1], label: "Poor" },
    ];

    const ratingBreakdown = {
      overall: overallRating,
      totalReviews,
      distribution,
    };

    const getInitials = (name) => {
      if (!name) return "U";
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);
    };

    const getAvatarColor = (name) => {
      if (!name) return "#7A7BA0";
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      const colors = ["#e2b84d", "#a347a3", "#4ea3a3", "#a34e4e", "#4ea34e", "#4e4ea3"];
      return colors[Math.abs(hash) % colors.length];
    };

    const formatTimeAgo = (date) => {
      const seconds = Math.floor((new Date() - new Date(date)) / 1000);
      if (seconds < 60) return "just now";
      let interval = Math.floor(seconds / 31536000);
      if (interval >= 1) return interval + (interval === 1 ? " year ago" : " years ago");
      interval = Math.floor(seconds / 2592000);
      if (interval >= 1) return interval + (interval === 1 ? " month ago" : " months ago");
      interval = Math.floor(seconds / 86400);
      if (interval >= 1) return interval + (interval === 1 ? " day ago" : " days ago");
      interval = Math.floor(seconds / 3600);
      if (interval >= 1) return interval + (interval === 1 ? " hour ago" : " hours ago");
      interval = Math.floor(seconds / 60);
      if (interval >= 1) return interval + (interval === 1 ? " minute ago" : " minutes ago");
      return "just now";
    };

    const recentActivities = reviews.map((r) => ({
      id: r._id.toString(),
      userName: r.user_id?.name || "User",
      userInitials: getInitials(r.user_id?.name),
      avatarColor: getAvatarColor(r.user_id?.name),
      rating: r.rating,
      text: r.comment,
      timestamp: formatTimeAgo(r.createdAt),
      businessName: r.business_id?.name || "My Business",
    }));

    return res.status(200).json({
      total_businesses: businesses.length,
      overall_totals: overall,
      businesses: businessSummaries,
      ratingBreakdown,
      recentActivities,
    });
  } catch (error) {
    console.error("[getBusinessAnalytics]", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { getAdminDashboard, getBusinessAnalytics, getAdminActivityLog };
