// THESE CONTROLLERS ARE ALREADY MADE IN AUTH.CONTROLLER.JS 
// REFER TO THEM

const User = require("./userModel");
const bcrypt = require("bcrypt");
const { logAdminActivity } = require("../adminActivity/adminActivityController");

// API to create User - old JWT style -> check auth.controller.js in auth for new one
const createUser = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;
    let profile_image = "";

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        message: "User Already Exists",
      });
    }
    if (req.file) {
      profile_image = req.file.path;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role,
      profile_image,
    });

    return res.status(201).json({
      success: true,
      message: "User Created",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// API to get all the users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json({
      message: "Fetched All Users",
      count: users.length,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// API to get user by ID
const getUserByID = async (req, res) => {
  try {
    const { userId } = req.body;
    let user;

    if (userId) {
      user = await User.findById(userId);
    } else if (req.dbUser) {
      user = req.dbUser;
    }

    if (!user) {
      return res.status(404).json({
        message: "User not Found",
      });
    }

    return res.status(200).json({
      message: "Fetched User By ID",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

// API to Update User
const updateUser = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const profile_image = req.file;

    const existingUser = req.dbUser;
   
    if (!existingUser) {
      return res.status(404).json({
        message: "User not Found",
      });
    }

    if (name) {
      existingUser.name = name;
    }
    if (phone) {
      existingUser.phone = phone;
    }
    if (profile_image) {
      existingUser.profile_image = profile_image.path;
    }
    await existingUser.save();

    return res.status(200).json({
      message: "User Updated",
      data: existingUser,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

// API to Delete User
const deleteUser = async (req, res) => {
  try {
    // only admin can delete the user
    if (!req.dbUser || req.dbUser.role !== "admin") {
      return res.status(403).json({
        message: "Forbidden!! Only admin can delete the user",
      });
    }

    const { userId } = req.body;
    const targetUserId = userId || req.dbUser?._id;

    if (!targetUserId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const existingUser = await User.findById(targetUserId);
    if (!existingUser || existingUser.is_blocked) {
      return res.status(404).json({
        message: "User Not Found",
      });
    }

    existingUser.is_blocked = true;
    await existingUser.save();

    await logAdminActivity(req, {
      action: "delete_user",
      resource: "user",
      resource_id: existingUser._id,
      resource_model: "User",
      details: { userId: targetUserId },
    });

    return res.status(200).json({
      message: "User blocked successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  createUser,
  getAllUsers,
  getUserByID,
  updateUser,
  deleteUser,
};
