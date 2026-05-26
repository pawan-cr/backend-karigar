const express = require("express");
const {
  checkUser,
  isAdmin,
  verifyToken,
} = require("../middleware/auth.middleware");
const {
  createCity,
  getAllCities,
  getCityById,
  updateCity,
  deleteCity,
  getActiveCities,
} = require("../api/cities/citiesController");
const router = express.Router();

router.post("/list", getActiveCities);
// router.post("/getactivecities", getActiveCities);
router.post("/create", verifyToken, checkUser, isAdmin, createCity);
// router.post("/createcity", verifyToken, checkUser, isAdmin, createCity);
router.post("/getallcities", verifyToken, checkUser, isAdmin, getAllCities);
router.post("/getcitybyid", verifyToken, checkUser, isAdmin, getCityById);
router.post("/update", verifyToken, checkUser, isAdmin, updateCity);
router.post("/updatecitybyid", verifyToken, checkUser, isAdmin, updateCity);
router.post("/deletecitybyid", verifyToken, checkUser, isAdmin, deleteCity);

module.exports = router;
