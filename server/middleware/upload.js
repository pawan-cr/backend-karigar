const multer = require("multer");
const fs = require("fs");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folderName = "others";
    if (file.fieldname === "profile_image") {
      folderName = "profile-images";
    }
    if (file.fieldname === "banner_image") {
      folderName = "banner-images";
    }
    if (file.fieldname === "category_image") {
      folderName = "category-images";
    }
    if (file.fieldname === "subcategory_image") {
      folderName = "subcategory-images";
    }
    if (file.fieldname === "logo") {
      folderName = "logo-images";
    }
    if (file.fieldname === "business_images") {
      folderName = "business-images";
    }
    if (file.fieldname === "review_images") {
      folderName = "review-images";
    }
    const uploadPath = path.join("server/public/uploads", folderName);
    fs.mkdirSync(uploadPath, { recursive: true });

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueName =
      file.fieldname + "_" + Date.now() + path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

const allowedExt = [".jpg", ".jpeg", ".png", ".webp"];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (file.mimetype.startsWith("image") && allowedExt.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files can be uploaded"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = upload;
