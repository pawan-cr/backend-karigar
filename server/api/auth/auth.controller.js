const User = require("../../api/user/userModel");
const { auth } = require("../../config/firebase");
const jwt = require("jsonwebtoken");
const Business = require("../business/businessModel");
const Category = require("../category/categoryModel");
const City = require("../cities/citiesModel");
const Report = require("../reports/reportModel");
const Verification = require("../verification/verificationModel");
const {
  logAdminActivity,
} = require("../adminActivity/adminActivityController");

const ALLOWED_SIGNUP_ROLES = ["user", "businessOwner"];
const ADMIN_ASSIGNABLE_ROLES = ["user", "businessOwner", "manager", "admin"];

const loginUser = async (req, res) => {
  try {
    const { uid, email, name, picture, phone_number } = req.user;
    const { role } = req.body;

    let user = await User.findOne({ firebase_uid: uid });

    if (!user) {
      let assignedRole = "user";
      if (role === "businessOwner" && ALLOWED_SIGNUP_ROLES.includes(role)) {
        assignedRole = role;
      }

      const newUserPayload = {
        firebase_uid: uid,
        name: name || "",
        email: email || null,
        phone: phone_number || null,
        profile_image: picture || "",
        role: assignedRole,
        is_blocked: false,
      };

      const newUser = await User.create(newUserPayload);

      const payload = {
        _id: newUser._id.toString(),
        userId: newUser._id.toString(),
        uid: newUser.firebase_uid,
        role: newUser.role,
      };

      const signToken = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      });

      return res.status(201).json({
        user: newUser,
        token: signToken,
        message: "User created successfully",
        isNew: true,
      });
    }

    if (user.is_blocked) {
      console.warn("[loginUser] Blocked user attempted login:", {
        _id: user._id,
        email: user.email,
      });
      return res.status(403).json({
        message: "Your account has been blocked",
        is_blocked: true,
      });
    }

    const payload = {
      _id: user._id.toString(),
      userId: user._id.toString(),
      uid: user.firebase_uid,
      role: user.role,
    };

    const signToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    return res.status(200).json({
      user: user,
      token: signToken,
      message: "Login successful",
      isNew: false,
    });
  } catch (error) {
    console.error("[loginUser] Unexpected error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getMe = async (req, res) => {
  try {
    return res.status(200).json({ user: req.dbUser });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, phone, profile_image } = req.body;

    const user = await User.findOneAndUpdate(
      { _id: req.dbUser._id },
      {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(profile_image && { profile_image }),
      },
      { new: true },
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const blockUser = async (req, res) => {
  try {
    const { userId, is_blocked } = req.body;

    if (typeof is_blocked !== "boolean") {
      return res.status(400).json({ message: "Bad request" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { is_blocked },
      { new: true },
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    try {
      await auth.updateUser(user.firebase_uid, { disabled: is_blocked });
    } catch (error) {
      console.error("Firebase disable error:", error);
    }

    await logAdminActivity(req, {
      action: is_blocked ? "block_user" : "unblock_user",
      resource: "user",
      resource_id: user._id,
      resource_model: "User",
      details: { userId, is_blocked },
    });

    return res.status(200).json({
      message: `User ${is_blocked ? "blocked" : "unblocked"} successfully`,
      user,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { role, is_blocked, search, page = 1, limit = 20 } = req.body;

    const filter = {};
    if (role && ADMIN_ASSIGNABLE_ROLES.includes(role)) {
      filter.role = role;
    }
    if (is_blocked !== undefined) {
      filter.is_blocked = is_blocked === "true";
    }
    if (search) {
      filter.$or = [
        { name: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
        { phone: new RegExp(search, "i") },
      ];
    }

    const users = await User.find(filter)
      .select("-firebase_uid -__v")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await User.countDocuments(filter);

    await logAdminActivity(req, {
      action: "list_users",
      resource: "user",
      details: {
        role: role || null,
        is_blocked: is_blocked === undefined ? null : is_blocked === "true",
        search: search || "",
        page: Number(page),
        limit: Number(limit),
      },
    });

    return res.status(200).json({
      users,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const changeUserRole = async (req, res) => {
  try {
    const { userId, role } = req.body;

    if (!ADMIN_ASSIGNABLE_ROLES.includes(role)) {
      return res.status(400).json({
        message: "Role must be user, businessOwner, manager, or admin",
      });
    }

    const user = await User.findByIdAndUpdate(userId, { role }, { new: true });

    if (!user) return res.status(404).json({ message: "User not found" });

    await logAdminActivity(req, {
      action: "change_user_role",
      resource: "user",
      resource_id: user._id,
      resource_model: "User",
      details: { userId, role },
    });

    return res.status(200).json({
      message: `Role changed to ${role}`,
      user,
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

const searchAdmin = async (req, res) => {
  try {
    const {
      q = "",
      limit = 10,
      include = "users,businesses,categories,subCategories,cities,reports,verifications",
    } = req.body;

    const query = q.trim();
    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const includeSet = new Set(
      String(include)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    );

    const results = {};
    const tasks = [];

    if (includeSet.has("users")) {
      tasks.push(
        User.find({
          $or: [
            { name: new RegExp(query, "i") },
            { email: new RegExp(query, "i") },
            { phone: new RegExp(query, "i") },
          ],
        })
          .select("-firebase_uid -__v")
          .sort({ createdAt: -1 })
          .limit(Number(limit))
          .then((docs) => {
            results.users = docs;
          }),
      );
    }

    if (includeSet.has("businesses")) {
      tasks.push(
        Business.find({
          $or: [
            { name: new RegExp(query, "i") },
            { description: new RegExp(query, "i") },
            { city: new RegExp(query, "i") },
            { address: new RegExp(query, "i") },
            { phone: new RegExp(query, "i") },
          ],
        })
          .sort({ createdAt: -1 })
          .limit(Number(limit))
          .then((docs) => {
            results.businesses = docs;
          }),
      );
    }

    if (includeSet.has("categories")) {
      tasks.push(
        Category.find({ name: new RegExp(query, "i") })
          .sort({ createdAt: -1 })
          .limit(Number(limit))
          .then((docs) => {
            results.categories = docs;
          }),
      );
    }

    if (includeSet.has("cities")) {
      tasks.push(
        City.find({ name: new RegExp(query, "i") })
          .sort({ createdAt: -1 })
          .limit(Number(limit))
          .then((docs) => {
            results.cities = docs;
          }),
      );
    }

    if (includeSet.has("subCategories")) {
      const SubCategory = require("../subCategory/subCategoryModel");
      tasks.push(
        SubCategory.find({
          name: new RegExp(query, "i"),
        })
          .populate("category_id", "name")
          .sort({ createdAt: -1 })
          .limit(Number(limit))
          .then((docs) => {
            results.subCategories = docs;
          }),
      );
    }

    if (includeSet.has("reports")) {
      tasks.push(
        Report.find()
          .populate("business_id", "name city")
          .populate("user_id", "name email")
          .sort({ createdAt: -1 })
          .then((docs) => {
            results.reports = docs
              .filter((report) =>
                new RegExp(query, "i").test(
                  [
                    report.reason,
                    report.status,
                    report.business_id?.name,
                    report.business_id?.city,
                    report.user_id?.name,
                    report.user_id?.email,
                  ]
                    .filter(Boolean)
                    .join(" "),
                ),
              )
              .slice(0, Number(limit));
          }),
      );
    }

    if (includeSet.has("verifications")) {
      tasks.push(
        Verification.find()
          .populate("business_id", "name city")
          .populate("manager_id", "name email")
          .sort({ createdAt: -1 })
          .then((docs) => {
            results.verifications = docs
              .filter((item) =>
                new RegExp(query, "i").test(
                  [
                    item.action,
                    item.reason,
                    item.business_id?.name,
                    item.business_id?.city,
                    item.manager_id?.name,
                    item.manager_id?.email,
                  ]
                    .filter(Boolean)
                    .join(" "),
                ),
              )
              .slice(0, Number(limit));
          }),
      );
    }

    await Promise.all(tasks);

    await logAdminActivity(req, {
      action: "global_search",
      resource: "search",
      details: {
        q: query,
        include: Array.from(includeSet),
        limit: Number(limit),
      },
    });

    return res.status(200).json({
      query,
      results,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updateFcmToken = async (req, res) => {
  const { fcm_token } = req.body;
  if (!fcm_token) {
    return res.status(400).json({ message: "Token required" });
  }
  await User.findByIdAndUpdate(req.dbUser._id, { fcm_token });
  return res.status(200).json({ message: "FCM token saved" });
};

module.exports = {
  loginUser,
  getMe,
  updateProfile,
  blockUser,
  getAllUsers,
  changeUserRole,
  searchAdmin,
  updateFcmToken,
};
