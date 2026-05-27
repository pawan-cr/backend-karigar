const express = require("express");
const Router = express.Router();
const {
  getAllUsers,
  getUserByID,
  updateUser,
  deleteUser,
} = require("../api/user/userController");
const { verifyToken, checkUser, isAdmin } = require("../middleware/auth.middleware");

Router.post("/createuser", (_req, res) =>
  res.status(410).json({
    message:
      "Deprecated. Use POST /api/auth/login with a Firebase ID token instead.",
  }),
);

Router.post("/getallusers", verifyToken, checkUser, isAdmin, getAllUsers);
Router.post("/getuserbyid", verifyToken, checkUser, getUserByID);
Router.post("/updateuserbyid", verifyToken, checkUser, updateUser);
Router.post("/deleteuserbyid", verifyToken, checkUser, isAdmin, deleteUser);

module.exports = Router;
