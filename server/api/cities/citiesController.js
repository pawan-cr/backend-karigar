const City = require("./citiesModel");
const { logAdminActivity } = require("../adminActivity/adminActivityController");

// API to create City
const createCity = async (req, res) => {
  try {
    const { name, state } = req.body;
    if (!name && !state) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }
    const existingCity = await City.findOne({ name, state });
    if (existingCity) {
      return res.status(409).json({
        message: "City already exists",
      });
    }
    const city = await City.create({
      name,
      state,
    });
    await logAdminActivity(req, {
      action: "create_city",
      resource: "city",
      resource_id: city._id,
      resource_model: "City",
      details: { name, state },
    });
    return res.status(201).json({
      message: "City Created",
      city,
      data: city,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

// API to get all the cities
const getAllCities = async (req, res) => {
  try {
    const cities = await City.find();
    return res.status(200).json({
      message: "All Cities fetched",
      count: cities.length,
      data: cities,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

// API to get active cities
const getActiveCities = async (req, res) => {
  try {
    const { state, status = "active" } = req.body;
    const filter = {};
    if (status) filter.status = status;
    if (state) filter.state = new RegExp(state, "i");

    const cities = await City.find(filter);
    return res.status(200).json({
      message: "Fetched Active Cities",
      count: cities.length,
      cities,
      data: cities,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

// API to get city by ID
const getCityById = async (req, res) => {
  try {
    const { city_id } = req.body;
    if (!city_id) {
      return res.status(400).json({
        message: "CityID is required",
      });
    }
    const city = await City.findById(city_id);
    if (!city) {
      return res.status(404).json({
        message: "City Not Found",
      });
    }
    return res.status(200).json({
      message: "City fetched by ID",
      data: city,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

// API to update City
const updateCity = async (req, res) => {
  try {
    const id = req.body.cityId || req.body.id;
    const { name, state, status } = req.body;

    if (!id) {
      return res.status(400).json({ message: "City ID is required" });
    }
    if (!name && !state && status === undefined) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }
    const existingCity = await City.findById(id);
    if (!existingCity) {
      return res.status(404).json({
        message: "City Not Found",
      });
    }
    const city = await City.findByIdAndUpdate(
      id,
      {
        ...(name && { name }),
        ...(state && { state }),
        ...(status !== undefined && { status }),
      },
      {
        new: true,
        runValidators: true,
      },
    );

    await logAdminActivity(req, {
      action: "update_city",
      resource: "city",
      resource_id: city._id,
      resource_model: "City",
      details: { id, name, state, status },
    });

    return res.status(200).json({
      message: "City Updated",
      city,
      data: city,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

// API to delete City
const deleteCity = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({
        message: "City ID is required",
      });
    }
    const city = await City.findById(id);
    city.status = "inactive";
    await city.save();
    await logAdminActivity(req, {
      action: "delete_city",
      resource: "city",
      resource_id: city._id,
      resource_model: "City",
      details: { id },
    });

    return res.status(200).json({
      message: "City Deleted(soft)",
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  createCity,
  getAllCities,
  getActiveCities,
  getCityById,
  updateCity,
  deleteCity,
};
