const User = require("../../api/user/userModel");
const { auth } = require("../../config/firebase");
const jwt = require("jsonwebtoken");
const path = require("path");
const {
  logAdminActivity,
} = require("../adminActivity/adminActivityController");
const { deleteFile } = require("../../middleware/upload");
const { adminSearch } = require("../../search/searchController");

const ALLOWED_SIGNUP_ROLES = ["user", "businessOwner", "manager"];
const ADMIN_ASSIGNABLE_ROLES = [
  "user",
  "businessOwner",
  "manager",
  "admin",
  "both",
];

const registerUser = async (req, res) => {
  try {
    const { uid, email, name: tokenName, picture, phone_number } = req.user;
    const { role, phone, name } = req.body;

    // if user is already there
    let existingUser = await User.findOne({ firebase_uid: uid });
    if (!existingUser && email) {
      existingUser = await User.findOne({ email });
      if (existingUser) {
        existingUser.firebase_uid = uid;
        await existingUser.save();
      }
    }

    if (existingUser) {
      if (existingUser.is_blocked) {
        return res.status(403).json({
          message: "Your account has been blocked",
          is_blocked: true,
        });
      }

      if (role) {
        if (
          (existingUser.role === "user" && role === "businessOwner") ||
          (existingUser.role === "businessOwner" && role === "user")
        ) {
          existingUser.role = "both";
          await existingUser.save();
        }
      }

      const payload = {
        _id: existingUser._id.toString(),
        userId: existingUser._id.toString(),
        uid: existingUser.firebase_uid,
        firebase_uid: existingUser.firebase_uid,
        role: existingUser.role,
      };

      const signToken = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      });

      return res.status(200).json({
        user: existingUser,
        token: signToken,
        message: "Login successful",
        isNew: false,
      });
    }

    let assignedRole = "user";
    if (role && ALLOWED_SIGNUP_ROLES.includes(role)) {
      assignedRole = role;
    }

    let finalPhone = phone || phone_number || undefined;
    if (finalPhone && typeof finalPhone === "string") {
      finalPhone = finalPhone.trim();
      if (finalPhone && !finalPhone.startsWith("+")) {
        if (finalPhone.length === 10 && /^\d+$/.test(finalPhone)) {
          finalPhone = "+91" + finalPhone;
        } else {
          finalPhone = "+" + finalPhone;
        }
      }
    }
    const finalName = name || tokenName || "";

    const userObj = {
      firebase_uid: uid,
      name: finalName,
      profile_image: picture || "",
      role: assignedRole,
      is_blocked: false,
    };

    if (email) {
      userObj.email = email;
    }
    if (finalPhone) {
      userObj.phone = finalPhone;
    }

    let newUser;
    try {
      newUser = await User.create(userObj);
    } catch (dbError) {
      // MongoDB failed — clean up the Firebase user so they can retry cleanly
      console.error(
        "[registerUser] MongoDB create failed, rolling back Firebase user:",
        dbError,
      );

      try {
        await auth.deleteUser(uid);
        console.log(`[registerUser] Firebase user ${uid} deleted successfully`);
      } catch (firebaseDeleteError) {
        // Firebase user might not exist or already deleted — log but don't throw
        console.error(
          "[registerUser] Failed to rollback Firebase user:",
          firebaseDeleteError.message,
        );
      }

      return res.status(500).json({
        message: "Registration failed. Try again.",
      });
    }

    const payload = {
      _id: newUser._id.toString(),
      userId: newUser._id.toString(),
      ui: newUser.firebase_uid,
      role: newUser.role,
    };

    const signToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    return res.status(201).json({
      user: newUser,
      token: signToken,
      message: "Account created successfully",
      isNew: true,
    });
  } catch (error) {
    console.log("[registerUser]", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const loginUser = async (req, res) => {
  try {
    const { uid, email } = req.user;
    const { role } = req.body;

    let user = await User.findOne({ firebase_uid: uid });

    if (!user && email) {
      user = await User.findOne({ email });
      if (user) {
        user.firebase_uid = uid;
        await user.save();
      }
    }

    if (!user) {
      return res.status(404).json({
        message: "Account not found. Please register first",
        isNew: true,
      });
    }

    if (user.is_blocked) {
      return res.status(403).json({
        message: "Your account has been blocked",
        is_blocked: true,
      });
    }

    if (role) {
      if (
        (user.role === "user" && role === "businessOwner") ||
        (user.role === "businessOwner" && role === "user")
      ) {
        user.role = "both";
        await user.save();
      }
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
    const { name, email, phone } = req.body;
    let profile_image;

    if (req.file) {
      // delete old profile image before saving new one
      if (req.dbUser.profile_image) {
        deleteFile(req.dbUser.profile_image);
      }
      profile_image = path
        .join("uploads", "profile-images", req.file.filename)
        .replace(/\\/g, "/");
    }

    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email.trim();
    if (phone !== undefined) {
      let finalPhone = phone.trim();
      if (finalPhone) {
        if (!finalPhone.startsWith("+")) {
          if (finalPhone.length === 10 && /^\d+$/.test(finalPhone)) {
            finalPhone = "+91" + finalPhone;
          } else {
            finalPhone = "+" + finalPhone;
          }
        }
        updateData.phone = finalPhone;
      }
    }
    if (profile_image !== undefined) updateData.profile_image = profile_image;

    const user = await User.findByIdAndUpdate(req.dbUser._id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    console.error("[updateProfile]", error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res
        .status(400)
        .json({ message: `An account with this ${field} already exists.` });
    }
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

const searchAdmin = adminSearch;

const updateFcmToken = async (req, res) => {
  const { fcm_token } = req.body;
  if (!fcm_token) {
    return res.status(400).json({ message: "Token required" });
  }
  await User.findByIdAndUpdate(req.dbUser._id, { fcm_token });
  return res.status(200).json({ message: "FCM token saved" });
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  blockUser,
  getAllUsers,
  changeUserRole,
  searchAdmin,
  updateFcmToken,
};
