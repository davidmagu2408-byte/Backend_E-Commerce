const { Product } = require("../models/product");
const { Category } = require("../models/category");
const express = require("express");
const router = express.Router();
const cloudinary = require("../utils/cloudinary");

// Get all products
router.get("/", async (req, res) => {
  try {
    const productList = await Product.find().populate("category");
    if (!productList) {
      res.status(500).json({ success: false });
    } else {
      res.send(productList);
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || err });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category");
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    return res.status(200).send(product);
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error occurred while fetching product" });
  }
});

// Get products by category ID
router.post("/create", async (req, res) => {
  try {
    const category = await Category.findById(req.body.category);
    if (!category) {
      return res.status(400).json({ message: "Invalid category" });
    } else {
      const imagesRaw = req.body && req.body.images;
      const UploadResult = await cloudinary.uploadImage(imagesRaw);
      let product = new Product({
        name: req.body.name,
        description: req.body.description,
        richDescription: req.body.richDescription,
        images: UploadResult,
        brand: req.body.brand,
        price: req.body.price,
        category: req.body.category,
        countInStock: req.body.countInStock,
        rating: req.body.rating,
        numReviews: req.body.numReviews,
        isFeatured: req.body.isFeatured,
      });
      product = await product.save();
      return res.status(201).send(product);
    }
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error occurred while creating product" });
  }
});

// Get products by category ID
router.get("/category/:categoryId", async (req, res) => {
  try {
    const products = await Product.find({
      category: req.params.categoryId,
    }).populate("category");
    if (!products) {
      return res
        .status(404)
        .json({ message: "No products found for this category" });
    }
    return res.status(200).send(products);
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error occurred while fetching products" });
  }
});

// Delete a product by ID
router.delete("/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || err });
  }
});

// Update a product by ID
router.put("/:id", async (req, res) => {
  try {
    const category = await Category.findById(req.body.category);
    if (!category) {
      return res.status(400).json({ message: "Invalid category" });
    }
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name,
        description: req.body.description,
        richDescription: req.body.richDescription,
        images: req.body.images,
        brand: req.body.brand,
        price: req.body.price,
        category: req.body.category,
        countInStock: req.body.countInStock,
        rating: req.body.rating,
        numReviews: req.body.numReviews,
        isFeatured: req.body.isFeatured,
      },
      { new: true },
    );
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    res.status(200).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || err });
  }
});

// Get total product count
router.get("/get/count", async (req, res) => {
  try {
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      return res.status(404).json({ message: "No products found" });
    }
    return res.status(200).json({ productCount: productCount });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error occurred while counting products" });
  }
});

// Get featured products
router.get("/get/featured/:count?", async (req, res) => {
  try {
    const count = req.params.count || 0;
    const featuredProducts = await Product.find({ isFeatured: true }).limit(
      Number(count),
    );
    return res.status(200).json({ featuredProducts: featuredProducts });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error occurred while fetching featured products" });
  }
});

// Get products by multiple category IDs
router.get("/get/featured/:categories", async (req, res) => {
  try {
    const categoryIds = req.params.categories.split(",");
    const products = await Product.find({
      category: { $in: categoryIds },
    }).populate("category");
    if (!products) {
      return res
        .status(404)
        .json({ message: "No products found for the given categories" });
    }
    return res.status(200).json({ products: products });
  } catch (err) {
    return res.status(500).json({
      message: "Error occurred while fetching products by categories",
    });
  }
});

module.exports = router;
