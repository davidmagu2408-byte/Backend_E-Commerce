const { Category } = require("../models/category");
const express = require("express");
const router = express.Router();
const cloudinary = require("../utils/cloudinary");
const multer = require("multer");

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB per file
const MAX_REQUEST_SIZE = 10 * 1024 * 1024; // 10 MB overall
const MAX_FILES = 10;
const ALLOWED_MIMETYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type; only JPEG, PNG, WEBP, GIF are allowed"));
    }
  },
});

router.use((req, res, next) => {
  const contentLength = parseInt(req.headers["content-length"] || "0", 10);
  if (contentLength && contentLength > MAX_REQUEST_SIZE) {
    return res.status(413).json({
      success: false,
      message: "Payload too large"
    });
  }
  next();
});

// Get all categories
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = 6;
    const totalPosts = await Category.countDocuments();
    const totalPages = totalPosts === 0 ? 1 : Math.ceil(totalPosts / perPage);
    if (page < 1 || page > totalPages) {
      return res.status(404).json({
        "success": false,
        "message": "Page not found"
      });
    }

    const categoryList = await Category.find().skip((page - 1) * perPage).limit(perPage).exec();
    const category = await Category.find();
    if (!categoryList) {
      res.status(500).json({
        "success": false,
        "message": "Category list not found"
      });
    } else {
      res.status(200).json({
        "success": true,
        "categoryList": categoryList,
        "category": category,
        "totalPages": totalPages,
        "page": page
      });
    }
  } catch (err) {
    res.status(500).json({
      "success": false,
      "error": err.message || err
    });
  }
});

// Delete all categories
router.delete("/delete-all", async (req, res) => {
  try {
    const result = await Category.deleteMany({});
    res.status(200).json({
      "success": true,
      "message": `${result.deletedCount} categories deleted successfully`,
    });
  } catch (err) {
    res.status(500).json({
      "success": false,
      "error": err.message || err
    });
  }
});

// Get a category by ID
router.get("/:id", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        "success": false,
        "message": "Category id not found"
      });
    }
    return res.status(200).send(
      {
        "success": true,
        "category": category,
        "message": "Data fetched successfully"
      });
  } catch (err) {
    return res
      .status(500)
      .json({
        "success": false,
        "error": err.message || err
      });
  }
});

// Create a new category
router.post("/create", upload.array("images", 10), async (req, res) => {
  try {
    let UploadResult = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = await cloudinary.uploadImage(file);
        UploadResult.push(url);
      }
    }
    const category = new Category({
      name: req.body.name,
      images: UploadResult,
      color: req.body.color,
    });

    const saved = await category.save();
    return res.status(200).json(
      {
        "success": true,
        "category": saved,
        "message": "Data saved successfully"
      })
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      "success": false,
      "error": err.message || err
    });
  }
});

// Delete a category by ID
router.delete("/delete/:id", async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({
        "success": false,
        "message": "Category not found"
      });
    }
    res.status(200).json({
      "success": true,
      "message": "Category deleted successfully"
    });
  } catch (err) {
    res.status(500).json({
      "success": false,
      "error": err.message || err
    });
  }
});

// Update a category by ID
router.put("/edit/:id", upload.array("images", 10), async (req, res) => {
  try {
    const existingImages = req.body.existingImages
      ? JSON.parse(req.body.existingImages)
      : [];
    console.log(existingImages);
    let UploadResult = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = await cloudinary.uploadImage(file);
        UploadResult.push(url);
      }
    }

    const finalImages = [...existingImages, ...UploadResult];
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name,
        images: finalImages,
        color: req.body.color,
      },
      { new: true },
    );
    if (!category)
      return res.status(404).json({
        "success": false,
        "message": "Not found"
      });
    res.status(200).json({
      "success": true,
      "data": category,
      "message": "Data updated successfully",
    });
  } catch (err) {
    res.status(500).json({
      "success": false,
      "error": err.message || err
    });
  }
});

module.exports = router;
