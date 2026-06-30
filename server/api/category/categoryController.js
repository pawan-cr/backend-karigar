const mongoose = require("mongoose");
const Category = require("./categoryModel");
const SubCategory = require("../subCategory/subCategoryModel");
const {
  logAdminActivity,
} = require("../adminActivity/adminActivityController");
const path = require("node:path");
const { deleteFile } = require("../../middleware/upload");
const { capitalize } = require("../../utils/stringHelper");

const getCategories = async (req, res) => {
  try {
    const { status = "active" } = req.body;
    const filter = status ? { status } : {};
    const categories = await Category.find(filter).sort({ name: 1 });
    return res.status(200).json({ categories });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const createCategory = async (req, res) => {
  try {
    let { name, icon, status } = req.body;
    if (name) name = capitalize(name);
    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    let category_image;

    const categoryImageFile =
      req.file ||
      (req.files &&
        req.files["category_image"] &&
        req.files["category_image"][0]);
    const iconImageFile =
      req.files && req.files["icon"] && req.files["icon"][0];

    if (categoryImageFile) {
      category_image = path
        .join("uploads", "category-images", categoryImageFile.filename)
        .replace(/\\/g, "/");
    }

    if (iconImageFile) {
      icon = path
        .join("uploads", "category-images", iconImageFile.filename)
        .replace(/\\/g, "/");
    }

    const category = await Category.create({
      name,
      category_image,
      icon,
      status,
    });
    await logAdminActivity(req, {
      action: "create_category",
      resource: "category",
      resource_id: category._id,
      resource_model: "Category",
      details: { name, status },
    });
    return res.status(201).json({ message: "Category created", category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Category already exists" });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { categoryId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ message: "Invalid category id" });
    }

    let { name, icon, status } = req.body;
    if (name) name = capitalize(name);

    const existing = await Category.findById(categoryId);
    if (!existing) {
      return res.status(404).json({ message: "Category not found" });
    }

    let category_image;

    const categoryImageFile =
      req.file ||
      (req.files &&
        req.files["category_image"] &&
        req.files["category_image"][0]);
    const iconImageFile =
      req.files && req.files["icon"] && req.files["icon"][0];

    if (categoryImageFile) {
      if (existing.category_image) deleteFile(existing.category_image);
      category_image = path
        .join("uploads", "category-images", categoryImageFile.filename)
        .replace(/\\/g, "/");
    }

    if (iconImageFile) {
      if (existing.icon) deleteFile(existing.icon);
      icon = path
        .join("uploads", "category-images", iconImageFile.filename)
        .replace(/\\/g, "/");
    }

    const category = await Category.findByIdAndUpdate(
      categoryId,
      {
        ...(name && { name }),
        ...(category_image && { category_image }),
        ...(icon !== undefined && { icon }),
        ...(status && { status }),
      },
      { new: true, runValidators: true },
    );

    if (!category)
      return res.status(404).json({ message: "Category not found" });

    await logAdminActivity(req, {
      action: "update_category",
      resource: "category",
      resource_id: category._id,
      resource_model: "Category",
      details: { categoryId, name, status },
    });
    return res.status(200).json({ message: "Category updated", category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Category already exists" });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

const createSubCategory = async (req, res) => {
  try {
    let { category_id, name, icon, status } = req.body;
    if (name) name = capitalize(name);
    let subcategory_image;

    const subcategoryImageFile =
      req.file ||
      (req.files &&
        req.files["subcategory_image"] &&
        req.files["subcategory_image"][0]);
    const iconImageFile =
      req.files && req.files["icon"] && req.files["icon"][0];

    if (subcategoryImageFile) {
      subcategory_image = path
        .join("uploads", "subcategory-images", subcategoryImageFile.filename)
        .replace(/\\/g, "/");
    }

    if (iconImageFile) {
      icon = path
        .join("uploads", "category-images", iconImageFile.filename)
        .replace(/\\/g, "/");
    }

    if (!category_id || !name) {
      return res
        .status(400)
        .json({ message: "Category and name are required" });
    }

    const categoryExists = await Category.findById(category_id);
    if (!categoryExists) {
      return res.status(404).json({ message: "Category not found" });
    }

    const subCategory = await SubCategory.create({
      category_id,
      name,
      subcategory_image,
      icon,
      status,
    });
    await logAdminActivity(req, {
      action: "create_sub_category",
      resource: "subCategory",
      resource_id: subCategory._id,
      resource_model: "SubCategory",
      details: { category_id, name, status },
    });
    return res
      .status(201)
      .json({ message: "Sub category created", subCategory });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Sub category already exists" });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getSubCategories = async (req, res) => {
  try {
    const { category_id, status = "active" } = req.body;
    const filter = {};
    if (category_id) filter.category_id = category_id;
    if (status) filter.status = status;

    const subCategories = await SubCategory.find(filter)
      .populate("category_id", "name")
      .sort({ name: 1 });

    return res.status(200).json({ subCategories });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updateSubCategory = async (req, res) => {
  try {
    const { subCategoryId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(subCategoryId)) {
      return res.status(400).json({ message: "Invalid sub category id" });
    }

    let { name, icon, status } = req.body;
    if (name) name = capitalize(name);

    // old image path
    const existing = await SubCategory.findById(subCategoryId);
    if (!existing) {
      return res.status(404).json({ message: "Sub category not found" });
    }

    let subcategory_image;

    const subcategoryImageFile =
      req.file ||
      (req.files &&
        req.files["subcategory_image"] &&
        req.files["subcategory_image"][0]);
    const iconImageFile =
      req.files && req.files["icon"] && req.files["icon"][0];

    if (subcategoryImageFile) {
      if (existing.subcategory_image) deleteFile(existing.subcategory_image);
      subcategory_image = path
        .join("uploads", "subcategory-images", subcategoryImageFile.filename)
        .replace(/\\/g, "/");
    }

    if (iconImageFile) {
      if (existing.icon) deleteFile(existing.icon);
      icon = path
        .join("uploads", "category-images", iconImageFile.filename)
        .replace(/\\/g, "/");
    }

    const subCategory = await SubCategory.findByIdAndUpdate(
      subCategoryId,
      {
        ...(name && { name }),
        ...(subcategory_image && { subcategory_image }),
        ...(icon !== undefined && { icon }),
        ...(status && { status }),
      },
      { new: true, runValidators: true },
    );

    if (!subCategory)
      return res.status(404).json({ message: "Sub category not found" });

    await logAdminActivity(req, {
      action: "update_sub_category",
      resource: "subCategory",
      resource_id: subCategory._id,
      resource_model: "SubCategory",
      details: { subCategoryId, name, status },
    });
    return res
      .status(200)
      .json({ message: "Sub category updated", subCategory });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ message: "Sub category already exists in this category" });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  createSubCategory,
  getSubCategories,
  updateSubCategory,
};
