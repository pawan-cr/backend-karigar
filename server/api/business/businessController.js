const mongoose = require("mongoose");
const Business = require("./businessModel");
const path = require("path");
const Verification = require("../verification/verificationModel");
const Analytics = require("../businessAnalytics/analyticsModel");
const RecentView = require("../recentView/recentModel");
const {
  logAdminActivity,
} = require("../adminActivity/adminActivityController");
const { Review } = require("../review/reviewModel");
const {
  isBusinessOpenNow,
  haversineKm,
  resolveCityFilter,
} = require("../../utils/businessFilters");
const { deleteFile } = require("../../middleware/upload");
const { notifyAdmins } = require("../../utils/notify");

const createSlug = (value) =>
  value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const buildUniqueSlug = async (name, requestedSlug) => {
  const baseSlug = createSlug(requestedSlug || name);
  let slug = baseSlug;
  let counter = 1;

  while (await Business.exists({ slug })) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return slug;
};

const baseVerifiedFilter = () => ({
  verified_status: "verified",
  is_active: true,
});

const applyPostListFilters = (businesses, options) => {
  let result = [...businesses];
  const { min_rating, open_now, lat, lng, max_km } = options;

  if (min_rating !== undefined && min_rating !== null && min_rating !== "") {
    result = result.filter((b) => b.rating >= Number(min_rating));
  }

  if (open_now === true || open_now === "true") {
    result = result.filter((b) => isBusinessOpenNow(b.timing));
  }

  if (lat !== undefined && lng !== undefined && max_km !== undefined) {
    const userLat = Number(lat);
    const userLng = Number(lng);
    const maxDistance = Number(max_km);
    result = result
      .map((b) => {
        const coords = b.coordinates;
        if (!coords?.latitude || !coords?.longitude) {
          return { business: b, distance_km: null };
        }
        const distance_km = haversineKm(
          userLat,
          userLng,
          coords.latitude,
          coords.longitude,
        );
        return { business: b, distance_km };
      })
      .filter(
        (item) => item.distance_km !== null && item.distance_km <= maxDistance,
      )
      .sort((a, b) => a.distance_km - b.distance_km)
      .map((item) => {
        const doc = item.business.toObject
          ? item.business.toObject()
          : item.business;
        doc.distance_km = Number(item.distance_km.toFixed(2));
        return doc;
      });
    return result;
  }

  return result;
};

// const registerBusiness = async (req, res) => {
//   try {
//     const {
//       name,
//       slug,
//       category,
//       sub_category,
//       description,
//       phone,
//       whatsapp,
//       website,
//       email,
//       address,
//       city,
//       state,
//       country,
//       pincode,
//       coordinates,
//       timing,
//       services,
//       logo,
//     } = req.body;

//     const business_images = req.files
//       ? req.files.map((file) =>
//           path
//             .join("uploads", "business-images", file.filename)
//             .replace(/\\/g, "/"),
//         )
//       : [];
//     const existingPhone = await Business.findOne({
//       phone,
//       owner_id: req.dbUser._id,
//     });
//     if (existingPhone) {
//       return res
//         .status(409)
//         .json({ message: "Business with this phone already exists" });
//     }

//     const uniqueSlug = await buildUniqueSlug(name, slug);

//     const business = await Business.create({
//       owner_id: req.dbUser._id,
//       name,
//       slug: uniqueSlug,
//       category,
//       sub_category,
//       description,
//       phone,
//       whatsapp,
//       website,
//       email,
//       address,
//       city,
//       state,
//       country,
//       pincode,
//       coordinates,
//       timing,
//       services,
//       logo,
//       business_images,
//       verified_status: "pending",
//       is_active: true,
//     });

//     await Verification.create({
//       business_id: business._id,
//       action: "pending",
//     });

//     return res.status(201).json({
//       message: "Business registered successfully and sent for verification",
//       business,
//     });
//   } catch (error) {
//     if (error.code === 11000) {
//       return res.status(409).json({
//         message: "Business with this slug or phone already exists",
//       });
//     }

//     return res
//       .status(500)
//       .json({ message: `Internal server error: ${error.message}` });
//   }
// };

const registerBusiness = async (req, res) => {
  try {
    const {
      name,
      slug,
      category,
      sub_category,
      description,
      phone,
      whatsapp,
      website,
      email,
      address,
      city,
      state,
      country,
      pincode,
      coordinates,
      timing,
      services,
    } = req.body;

    // Handle logo (single file)
    const logo = req.files?.logo?.[0]
      ? path
          .join("uploads", "logo-images", req.files.logo[0].filename)
          .replace(/\\/g, "/")
      : "";

    // Handle business images (multiple files)
    const business_images = req.files?.business_images
      ? req.files.business_images.map((file) =>
          path
            .join("uploads", "business-images", file.filename)
            .replace(/\\/g, "/"),
        )
      : [];

    // const existingPhone = await Business.findOne({
    //   phone,
    //   owner_id: req.dbUser._id,
    // });

    // if (existingPhone) {
    //   return res
    //     .status(409)
    //     .json({ message: "Business with this phone already exists" });
    // }

    const uniqueSlug = await buildUniqueSlug(name, slug);

    const business = await Business.create({
      owner_id: req.dbUser._id,
      name,
      slug: uniqueSlug,
      category,
      sub_category,
      description,
      phone,
      whatsapp,
      website,
      email,
      address,
      city,
      state,
      country,
      pincode,
      coordinates,
      timing,
      services,
      logo,
      business_images,
      verified_status: "pending",
      is_active: true,
    });

    await Verification.create({
      business_id: business._id,
      action: "pending",
    });

    await notifyAdmins(
      "New Business Registered",
      `A new business "${business.name}" has been registered and is pending verification.`,
      "new_business"
    );

    return res.status(201).json({
      message: "Business registered successfully and sent for verification",
      business,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Business with this slug or phone already exists",
      });
    }

    return res.status(500).json({
      message: `Internal server error: ${error.message}`,
    });
  }
};

// const updateBusiness = async (req, res) => {
//   try {
//     const { businessId } = req.body;

//     if (!mongoose.Types.ObjectId.isValid(businessId)) {
//       return res.status(400).json({ message: "Invalid business id" });
//     }

//     const business = await Business.findById(businessId);
//     if (!business) {
//       return res.status(404).json({ message: "Business not found" });
//     }

//     const ownsBusiness =
//       business.owner_id.toString() === req.dbUser._id.toString();
//     if (!ownsBusiness && req.dbUser.role !== "admin") {
//       return res
//         .status(403)
//         .json({ message: "Not allowed to update this business" });
//     }

//     const currentName = business.name;
//     const allowedFields = [
//       "name",
//       "category",
//       "sub_category",
//       "description",
//       "phone",
//       "whatsapp",
//       "website",
//       "email",
//       "address",
//       "city",
//       "state",
//       "country",
//       "pincode",
//       "coordinates",
//       "services",
//       "logo",
//       "business_images",
//     ];

//     allowedFields.forEach((field) => {
//       if (req.body[field] !== undefined) {
//         business[field] = req.body[field];
//       }
//     });

//     if (req.body.name && req.body.name !== currentName) {
//       business.slug = await buildUniqueSlug(req.body.name, req.body.slug);
//     }

//     if (ownsBusiness && business.verified_status !== "pending") {
//       business.verified_status = "pending";
//       business.verified_by = undefined;
//       business.reject_reason = undefined;
//       await Verification.create({
//         business_id: business._id,
//         action: "pending",
//         reason: "Business updated by owner",
//       });
//     }

//     await business.save();

//     if (req.dbUser.role === "admin") {
//       await logAdminActivity(req, {
//         action: "update_business",
//         resource: "business",
//         resource_id: business._id,
//         resource_model: "Business",
//         details: { businessId, updatedBy: "admin" },
//       });
//     }

//     return res.status(200).json({
//       message: "Business updated successfully",
//       business,
//     });
//   } catch (error) {
//     if (error.code === 11000) {
//       return res
//         .status(409)
//         .json({ message: "Business phone or slug already exists" });
//     }
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

const updateBusiness = async (req, res) => {
  try {
    const { businessId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return res.status(400).json({ message: "Invalid business id" });
    }

    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    const ownsBusiness =
      business.owner_id.toString() === req.dbUser._id.toString();
    if (!ownsBusiness && req.dbUser.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Not allowed to update this business" });
    }

    const currentName = business.name;

    let previousStateSnapshot = null;
    const shouldResetVerification = ownsBusiness && business.verified_status !== "pending";

    if (shouldResetVerification) {
      previousStateSnapshot = {};
      const fieldsToSnapshot = [
        "name",
        "category",
        "sub_category",
        "description",
        "phone",
        "whatsapp",
        "website",
        "email",
        "address",
        "city",
        "state",
        "country",
        "pincode",
        "coordinates",
        "services",
        "logo",
        "business_images",
        "timing",
      ];

      fieldsToSnapshot.forEach((field) => {
        if (business[field] !== undefined) {
          previousStateSnapshot[field] = JSON.parse(JSON.stringify(business[field]));
        }
      });

      if (business.category) {
        previousStateSnapshot.category = business.category.toString();
        const cat = await mongoose.model("Category").findById(business.category);
        if (cat) previousStateSnapshot.category_name = cat.name;
      }
      if (business.sub_category) {
        previousStateSnapshot.sub_category = business.sub_category.toString();
        const subCat = await mongoose.model("SubCategory").findById(business.sub_category);
        if (subCat) previousStateSnapshot.sub_category_name = subCat.name;
      }
    }

    const allowedFields = [
      "name",
      "category",
      "sub_category",
      "description",
      "phone",
      "whatsapp",
      "website",
      "email",
      "address",
      "city",
      "state",
      "country",
      "pincode",
      "coordinates",
      "services",
    ];

    // Update normal fields
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        business[field] = req.body[field];
      }
    });

    // Update logo (single file)
    if (req.files?.logo?.[0]) {
      if (business.logo) deleteFile(business.logo);
      business.logo = path
        .join("uploads", "logo-images", req.files.logo[0].filename)
        .replace(/\\/g, "/");
    }

    // Update business images (append new ones)
    if (req.files?.business_images?.length) {
      const newImages = req.files.business_images.map((file) =>
        path
          .join("uploads", "business-images", file.filename)
          .replace(/\\/g, "/"),
      );
      business.business_images = [...(business.business_images || []), ...newImages];
    }

    // Update slug if name changed
    if (req.body.name && req.body.name !== currentName) {
      business.slug = await buildUniqueSlug(req.body.name, req.body.slug);
    }

    // Reset verification
    if (shouldResetVerification) {
      business.verified_status = "pending";
      business.verified_by = undefined;
      business.reject_reason = undefined;

      await Verification.create({
        business_id: business._id,
        action: "pending",
        reason: "Business updated by owner",
        previous_state: previousStateSnapshot,
      });
    }

    await business.save();

    if (req.dbUser.role === "admin") {
      await logAdminActivity(req, {
        action: "update_business",
        resource: "business",
        resource_id: business._id,
        resource_model: "Business",
        details: { businessId, businessName: business.name, updatedBy: "admin" },
      });
    }

    return res.status(200).json({
      message: "Business updated successfully",
      business,
    });
  } catch (error) {
    console.error("[updateBusiness]", error);

    if (error.code === 11000) {
      return res
        .status(409)
        .json({ message: "Business phone or slug already exists" });
    }

    return res.status(500).json({
      message: `Internal server error: ${error.message}`,
    });
  }
};

const updateBusinessTiming = async (req, res) => {
  try {
    const { businessId, timing } = req.body;

    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return res.status(400).json({ message: "Invalid business id" });
    }
    if (!Array.isArray(timing)) {
      return res.status(400).json({ message: "Timing must be an array" });
    }

    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }
    if (
      business.owner_id.toString() !== req.dbUser._id.toString() &&
      req.dbUser.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ message: "Not allowed to update this business" });
    }

    business.timing = timing;
    await business.save();

    if (req.dbUser.role === "admin") {
      await logAdminActivity(req, {
        action: "update_business_timing",
        resource: "business",
        resource_id: business._id,
        resource_model: "Business",
        details: { businessId, businessName: business.name },
      });
    }

    return res
      .status(200)
      .json({ message: "Business timing updated", business });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// const updateBusinessImages = async (req, res) => {
//   try {
//     const { businessId, logo, images } = req.body;

//     if (!mongoose.Types.ObjectId.isValid(businessId)) {
//       return res.status(400).json({ message: "Invalid business id" });
//     }

//     const business = await Business.findById(businessId);
//     if (!business) {
//       return res.status(404).json({ message: "Business not found" });
//     }
//     if (
//       business.owner_id.toString() !== req.dbUser._id.toString() &&
//       req.dbUser.role !== "admin"
//     ) {
//       return res
//         .status(403)
//         .json({ message: "Not allowed to update this business" });
//     }

//     if (logo !== undefined) business.logo = logo;
//     if (images !== undefined) business.images = images;
//     await business.save();

//     if (req.dbUser.role === "admin") {
//       await logAdminActivity(req, {
//         action: "update_business_images",
//         resource: "business",
//         resource_id: business._id,
//         resource_model: "Business",
//         details: { businessId },
//       });
//     }

//     return res
//       .status(200)
//       .json({ message: "Business images updated", business });
//   } catch (error) {
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

const updateBusinessImages = async (req, res) => {
  try {
    const { businessId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return res.status(400).json({ message: "Invalid business id" });
    }

    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    const ownsBusiness =
      business.owner_id.toString() === req.dbUser._id.toString();
    if (!ownsBusiness && req.dbUser.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Not allowed to update this business" });
    }

    // Update logo (replace old logo)
    if (req.files?.logo?.[0]) {
      if (business.logo) deleteFile(business.logo);
      business.logo = path
        .join("uploads", "logo-images", req.files.logo[0].filename)
        .replace(/\\/g, "/");
    }

    // Update business images (append new images)
    if (req.files?.business_images?.length) {
      const newImages = req.files.business_images.map((file) =>
        path
          .join("uploads", "business-images", file.filename)
          .replace(/\\/g, "/"),
      );
      business.business_images = [...(business.business_images || []), ...newImages];
    }

    await business.save();

    // Admin log
    if (req.dbUser.role === "admin") {
      await logAdminActivity(req, {
        action: "update_business_images",
        resource: "business",
        resource_id: business._id,
        resource_model: "Business",
        details: { businessId, businessName: business.name },
      });
    }

    return res.status(200).json({
      message: "Business images updated successfully",
      business,
    });
  } catch (error) {
    console.error("[updateBusinessImages]", error);

    return res.status(500).json({
      message: `Internal server error: ${error.message}`,
    });
  }
};

const getMyBusinesses = async (req, res) => {
  try {
    const businesses = await Business.find({ owner_id: req.dbUser._id })
      .populate("category", "name image icon")
      .populate("sub_category", "name image icon")
      .sort({ createdAt: -1 });

    return res.status(200).json({ businesses });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const deleteBusiness = async (req, res) => {
  try {
    const { businessId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return res.status(400).json({ message: "Invalid Business Id" });
    }

    const business = await Business.findOneAndDelete({
      _id: businessId,
      owner_id: req.dbUser._id,
    });

    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    // delete image and logo from server
    if (business.logo) deleteFile(business.logo);
    if (business.business_images?.length) {
      business.business_images.forEach((img) => deleteFile(img));
    }

    if (req.dbUser.role === "admin") {
      await logAdminActivity(req, {
        action: "delete_business",
        resource: "business",
        resource_id: business._id,
        resource_model: "Business",
        details: { businessId, businessName: business.name },
      });
    }

    return res.status(200).json({ message: "Business deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getApprovedBusinesses = async (req, res) => {
  try {
    const body = req.body;
    const {
      category,
      sub_category,
      city,
      cityId,
      search,
      min_rating,
      open_now,
      lat,
      lng,
      max_km,
      page = 1,
      limit = 20,
    } = body;

    const filter = baseVerifiedFilter();

    if (category) filter.category = category;
    if (sub_category) filter.sub_category = sub_category;

    const cityRegex = await resolveCityFilter(city, cityId);
    if (cityRegex) filter.city = cityRegex;

    if (search) {
      filter.$text = { $search: search };
    }

    let query = Business.find(filter)
      .populate("category", "name image icon")
      .populate("sub_category", "name image icon");

    if (search) {
      query = query.select({ score: { $meta: "textScore" } }).sort({
        score: { $meta: "textScore" },
        rating: -1,
      });
    } else {
      query = query.sort({ rating: -1, createdAt: -1 });
    }

    const allMatches = await query;
    const filtered = applyPostListFilters(allMatches, {
      min_rating,
      open_now,
      lat,
      lng,
      max_km,
    });

    const total = filtered.length;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const businesses = filtered.slice(
      (pageNum - 1) * limitNum,
      pageNum * limitNum,
    );

    return res.status(200).json({
      businesses,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getHomeSections = async (req, res) => {
  try {
    const { lat, lng, limit = 10, city, cityId } = req.body;
    const sectionLimit = Math.min(Number(limit) || 10, 50);
    const filter = baseVerifiedFilter();

    const cityRegex = await resolveCityFilter(city, cityId);
    if (cityRegex) filter.city = cityRegex;

    const populateOpts = [
      { path: "category", select: "name image icon" },
      { path: "sub_category", select: "name image icon" },
    ];

    const [topRated, newlyVerified, trendingRaw, totalBusinesses, totalReviews, ratingStats] = await Promise.all([
      Business.find(filter)
        .populate(populateOpts)
        .sort({ rating: -1, total_reviews: -1 })
        .limit(sectionLimit),
      Business.find(filter)
        .populate(populateOpts)
        .sort({ updatedAt: -1 })
        .limit(sectionLimit),
      Business.find(filter)
        .populate(populateOpts)
        .sort({ views: -1 })
        .limit(sectionLimit * 3),
      Business.countDocuments(filter),
      Review.countDocuments({ status: "approved" }),
      Business.aggregate([
        { $match: filter },
        { $group: { _id: null, avgRating: { $avg: "$rating" } } }
      ])
    ]);

    const avgRating = ratingStats.length > 0 ? Number(ratingStats[0].avgRating.toFixed(1)) : 0;

    let trending = trendingRaw;
    if (lat !== undefined && lng !== undefined) {
      trending = applyPostListFilters(trendingRaw, {
        lat,
        lng,
        max_km: req.body.max_km || 50,
      }).slice(0, sectionLimit);
    } else {
      trending = trending.slice(0, sectionLimit);
    }

    return res.status(200).json({
      sections: {
        topRated,
        newlyVerified,
        trending,
      },
      stats: {
        businesses: totalBusinesses,
        reviews: totalReviews,
        avgRating
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// const getBusinessDetails = async (req, res) => {
//   try {
//     const { _id, slug } = req.body;
//     console.log(req.body);
//     const filter = mongoose.Types.ObjectId.isValid(_id)
//       ? { _id: id }
//       : { slug: slug };
//     console.log(filter);

//     const business = await Business.findById(mongoose.Types.ObjectId(_id))
//       .populate("category", "name image icon")
//       .populate("sub_category", "name image icon")
//       .populate("reviews");

//     if (!business) {
//       return res.status(404).json({ message: "Business not found" });
//     }

//     if (req.dbUser) {
//       await RecentView.findOneAndUpdate(
//         { user_id: req.dbUser._id, business_id: business._id },
//         { view_at: new Date() },
//         { upsert: true, new: true, setDefaultsOnInsert: true },
//       );
//     }

//     return res.status(200).json({ business });
//   } catch (error) {
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

const getBusinessDetails = async (req, res) => {
  try {
    const { _id, slug } = req.body;

    if (!_id && !slug) {
      return res
        .status(400)
        .json({ message: "Either _id or slug is required" });
    }

    let business;

    if (_id) {
      if (!mongoose.Types.ObjectId.isValid(_id)) {
        return res.status(400).json({ message: "Invalid _id format" });
      }
      business = await Business.findById(_id)
        .populate("category", "name image icon")
        .populate("sub_category", "name image icon")
        .populate("reviews");
    } else {
      business = await Business.findOne({ slug })
        .populate("category", "name image icon")
        .populate("sub_category", "name image icon")
        .populate("reviews");
    }

    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    if (req.dbUser) {
      await RecentView.findOneAndUpdate(
        { user_id: req.dbUser._id, business_id: business._id },
        { view_at: new Date() },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }

    return res.status(200).json({ business });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const trackBusinessAction = async (req, res) => {
  try {
    const { businessId, action } = req.body;
    const actionFields = {
      view: "views",
      call: "call_click",
      whatsapp: "whatsapp_click",
      website: "website_click",
      maps: "maps_click",
    };

    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return res.status(400).json({ message: "Invalid business id" });
    }
    if (!actionFields[action]) {
      return res.status(400).json({ message: "Invalid tracking action" });
    }

    const business = await Business.findOneAndUpdate(
      { _id: businessId, ...baseVerifiedFilter() },
      { $inc: { [actionFields[action]]: 1 } },
      { new: true },
    );

    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const analyticsField =
      action === "view" ? "profile_views" : actionFields[action];

    await Analytics.findOneAndUpdate(
      { business_id: businessId, date: startOfDay },
      { $inc: { [analyticsField]: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return res.status(200).json({ message: "Business action tracked" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getAdminBusinesses = async (req, res) => {
  try {
    const { limit = 200, page = 1, search } = req.body;
    const filter = { verified_status: "verified" };

    if (search) {
      filter.$text = { $search: search };
    }

    const businesses = await Business.find(filter)
      .populate("owner_id", "name email phone")
      .populate("category", "name image icon")
      .populate("sub_category", "name image icon")
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Business.countDocuments(filter);

    return res.status(200).json({
      businesses,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)) || 1,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const suspendBusiness = async (req, res) => {
  try {
    const { businessId, is_active, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return res.status(400).json({ message: "Invalid business id" });
    }
    if (typeof is_active !== "boolean") {
      return res.status(400).json({ message: "is_active must be boolean" });
    }

    const updateFields = { is_active };
    if (!is_active) {
      updateFields.suspend_reason = reason || "Suspended by admin";
    } else {
      updateFields.suspend_reason = ""; // clear it when activating
    }

    const business = await Business.findByIdAndUpdate(
      businessId,
      { $set: updateFields },
      { new: true },
    );
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    // Log admin activity
    await logAdminActivity(req, {
      action: is_active ? "reactivate_business" : "suspend_business",
      resource: "business",
      resource_id: business._id,
      resource_model: "Business",
      details: { businessId, businessName: business.name, reason },
    });

    return res.status(200).json({
      message: `Business ${is_active ? "activated" : "suspended"} successfully`,
      business,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  registerBusiness,
  updateBusiness,
  updateBusinessTiming,
  updateBusinessImages,
  getMyBusinesses,
  deleteBusiness,
  getApprovedBusinesses,
  getHomeSections,
  getBusinessDetails,
  trackBusinessAction,
  suspendBusiness,
  getAdminBusinesses,
};
