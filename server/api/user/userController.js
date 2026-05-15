const User = require("./userModel");
const bcrypt = require("bcrypt");

// API to create User
const createUser = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        message: "User Already Exists",
      });
    }
    if (req.file) {
      profile_image = req.file.path;
    }

    const hashedPassword = bcrypt.hash(password, 10);
    const user = await User.create({
      fullname,
      email,
      password: hashedPassword,
      phone,
      role,
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
    const userID = req.user?.id;
    if (!userID) {
      return res.status(401).json({
        message: "User Unauthorized",
      });
    }

    const user = await User.findById(userID).select("-password");

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
    const userID = req.user?.id;
    const { name, phone } = req.body;
    const profile_image = req.file;

    if (!userID) {
      return res.status(401).json({
        message: "User Unauthorized",
      });
    }

    const existingUser = await User.findById(userID);
    if (!existingUser) {
      return res.status(404).json({
        message: "User Not Found",
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
    const userID = req.user?.id;
    if (!userID) {
      return res.status(401).json({
        message: "User Unauthorized",
      });
    }
    // only admin can delete the user
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Forbidden!! Only admin can delete the user",
      });
    }

    const existingUser = await User.findById(userID).select("-password");
    if (!existingUser || existingUser.is_blocked) {
      return res.status(404).json({
        message: "User Not Found",
      });
    }

    existingUser.is_blocked = true;
    await existingUser.save();

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
