const User = require("../../api/user/userModel");
const { auth } = require("../../config/firebase");

const loginUser = async (req, res) => {
  try {
    const { uid, email, name, picture, phone_number } = req.user;

    let user = await User.findOne({ firebase_uid: uid });

    if (!user) {
      newUser = await User.create({
        firebase_uid: uid,
        name: name || "",
        email: email || "",
        phone: phone_number || "",
        profile_image: picture || "",
        role: "user",
        is_blocked: false,
      });
      return res.status(201).json({
        message: "User created successfully",
        isNew: true,
        user: newUser,
      });
    }

    // blocked user
    if (user.is_blocked) {
      return res.status(403).json({
        message: "Your account has been blocked",
        is_blocked: true,
      });
    }

    return res.status(200).json({
      message: "Login successful",
      isNew: false,
      user,
    });
  } catch (error) {
    console.log("Error in syncing:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findOne({ firebase_uid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.is_blocked) {
      return res.status(403).json({
        message: "Your account has been blocked",
        is_blocked: true,
      });
    }
    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, phone, profile_image } = req.body;

    const user = await User.findOneAndUpdate(
      { firebase_uid: req.user.uid },
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
    const { userId } = req.params;
    const { is_blocked } = req.body;

    if (typeof is_blocked !== "boolean") {
      return res.status(400).json({ message: "is_blocked must be a boolean" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { is_blocked },
      { new: true },
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // disable in firebase so their token stops working
    try {
      await auth.updateUser(user.firebase_uid, { disabled: is_blocked });
    } catch (error) {
      console.error("Firebase disable error:", error);
    }

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
    const { role, is_blocked, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (role && ["user", "businessOwner"].includes(role)) {
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
    const { userId } = req.params;
    const { role } = req.body;

    if (!["user", "owner"].includes(role)) {
      return res.status(400).json({ message: "Role must be user or owner" });
    }

    const user = await User.findByIdAndUpdate(userId, { role }, { new: true });

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({
      message: `Role changed to ${role}`,
      user,
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  loginUser,
  getMe,
  updateProfile,
  blockUser,
  getAllUsers,
  changeUserRole,
};
