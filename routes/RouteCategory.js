const { Category } = require("../models/category");
const express = require("express");
const router = express.Router();
const cloudinary = require("../utils/cloudinary");
const mongoose = require("mongoose");
const multer = require("multer");
const upload = multer();

// Get all categories
router.get("/", async (req, res) => {
  try {
    const categoryList = await Category.find();
    if (!categoryList) {
      res.status(500).json({ success: false });
    }
    res.send(categoryList);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || err });
  }
});

// Delete all categories
router.delete("/delete-all", async (req, res) => {
  try {
    const result = await Category.deleteMany({});
    res.status(200).json({
      success: true,
      message: `${result.deletedCount} categories deleted successfully`,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || err });
  }
});

// Get a category by ID
router.get("/:id", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    return res.status(200).send(category);
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error occurred while fetching category" });
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
    return res.status(201).json(saved);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message || err });
  }
});

// Delete a category by ID
router.delete("/delete/:id", async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Category deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || err });
  }
});

// Update a category by ID
router.put("/edit/:id", upload.array("images", 10), async (req, res) => {
  try {
    console.log(req);
    const name = req.body?.name;
    const color = req.body?.color;
    const existingImages = req.body.existingImages
      ? JSON.parse(req.body.existingImages)
      : [];
    let UploadResult = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = await cloudinary.uploadImage(file);
        UploadResult.push(url);
      }
    }
    const finalImages = [...existingImages, ...newUploadResults];
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
      return res.status(404).json({ success: false, message: "Not found" });
    res.status(200).json({
      success: true,
      data: category,
      message: "Data updated successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || err });
  }
});

module.exports = router;
