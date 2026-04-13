const { Product } = require("../models/product");
const express = require("express");
const router = express.Router();
const cloudinary = require("../utils/cloudinary");
const multer = require("multer");
const verifyToken = require("../middlewares/jwt");
const { verifyAdmin } = require("../middlewares/jwt");

// Upload configuration: memory storage, limit file size and validate mimetypes
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB per file
const MAX_REQUEST_SIZE = 10 * 1024 * 1024; // 10 MB overall (via Content-Length check)
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

// Middleware to enforce a maximum request size (basic check via Content-Length)
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

// Get all products (kept simple; original pagination/filtering omitted)
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = 6;
    const totalPosts = await Product.countDocuments();
    const totalPages = totalPosts === 0 ? 1 : Math.ceil(totalPosts / perPage);
    if (page < 1 || page > totalPages) {
      return res.status(404).json({
        success: false,
        message: "Page not found"
      });
    }
    const productList = await Product.find().skip((page - 1) * perPage).limit(perPage).exec();
    return res.status(200).json({
      success: true,
      productList: productList,
      totalDocs: totalPosts,
      totalPages: totalPages,
      page: page,
      message: "Data fetched successfully"
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || err
    });
  }
});

// Get featured products
router.get("/featured", async (req, res) => {
  try {
    const product = await Product.find({ isFeatured: true });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    } else {
      return res.status(200).json({
        success: true,
        product: product,
        message: "Data fetched successfully"
      });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || err
    });
  }
});

// Get new products (sorted by dateCreated desc)
router.get("/new", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 12, 50);
    const products = await Product.find().sort({ dateCreated: -1 }).limit(limit);
    return res.status(200).json({
      success: true,
      products: products,
      message: "New products fetched successfully"
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || err
    });
  }
});

// Search products by name
router.get("/search", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) {
      return res.status(400).json({ success: false, message: "Query is required" });
    }
    const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const products = await Product.find({
      name: { $regex: escapedQ, $options: "i" }
    }).limit(50);
    return res.status(200).json({
      success: true,
      products: products,
      message: "Search results fetched successfully"
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || err
    });
  }
});

// Add a review to a product
router.post("/:id/review", verifyToken, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || !comment || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating (1-5) and comment are required" });
    }
    const { User } = require("../models/user");
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    );
    if (alreadyReviewed) {
      return res.status(400).json({ success: false, message: "Bạn đã đánh giá sản phẩm này rồi" });
    }
    const review = {
      user: req.user._id,
      userName: user.name,
      rating: Number(rating),
      comment: comment.trim().substring(0, 1000),
    };
    product.reviews.push(review);
    product.numReviews = product.reviews.length;
    product.rating = product.reviews.reduce((acc, r) => acc + r.rating, 0) / product.reviews.length;
    await product.save();
    return res.status(200).json({
      success: true,
      message: "Đánh giá đã được thêm",
      reviews: product.reviews,
      rating: product.rating,
      numReviews: product.numReviews
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || err });
  }
});

// Get reviews for a product
router.get("/:id/reviews", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).select("reviews rating numReviews");
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    return res.status(200).json({
      success: true,
      reviews: product.reviews,
      rating: product.rating,
      numReviews: product.numReviews
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || err });
  }
});

// Create product with images - validate files before passing to cloudinary
router.post("/create", verifyToken, verifyAdmin, upload.array("images", MAX_FILES), async (req, res) => {
  try {
    if (req.files && req.files.length > MAX_FILES) {
      return res.status(400).json({ success: false, message: `Maximum ${MAX_FILES} files allowed` });
    }

    let UploadResult = [];
    if (req.files && req.files.length > 0) {
      // pass each file (buffer) to cloudinary implementation; ensure file has buffer
      for (const file of req.files) {
        if (!file || !file.buffer) continue; // skip unexpected items
        // cloudinary.uploadImage should be able to accept buffer or file object
        const url = await cloudinary.uploadImage(file);
        UploadResult.push(url);
      }
    }

    const product = new Product({
      name: req.body.name,
      description: req.body.description,
      oldPrice: req.body.oldPrice,
      brand: req.body.brand,
      price: req.body.price,
      images: UploadResult.length > 0 ? UploadResult : (req.body.images || []),
      category: req.body.category,
      subcategory: req.body.subcategory,
      countInStock: req.body.countInStock,
      rating: req.body.rating,
      numReviews: req.body.numReviews,
      isFeatured: req.body.isFeatured,
      discount: req.body.discount || 0,
      dateCreated: new Date(),
    });
    const saved = await product.save();
    return res.status(200).send({
      success: true,
      product: saved,
      message: "Data saved successfully"
    });
  } catch (err) {
    // multer file filter errors come here as Error
    return res.status(500).json({
      success: false,
      error: err.message || err
    });
  }
});



// Get products by category ID
router.get("/category/:categoryId", async (req, res) => {
  try {
    const products = await Product.find({ category: req.params.categoryId });
    return res.status(200).json({
      success: true,
      products: products,
      message: "List products by category ID fetched successfully"
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || err
    });
  }
});

// Get products by subcategory ID
router.get("/subcategory/:subcategoryId", async (req, res) => {
  try {
    const products = await Product.find({ subcategory: req.params.subcategoryId });
    return res.status(200).json({
      success: true,
      products: products,
      message: "List products by subcategory ID fetched successfully"
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || err
    });
  }
});

// Get single product with related data
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category").populate("subcategory").populate("brand");
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
    return res.status(200).json({
      success: true,
      product: product,
      message: "Data product by ID fetched successfully"
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || err
    });
  }
});

// Delete a product by ID (keep path consistent with other routes)
router.delete("/delete/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
    return res.status(200).json({
      success: true,
      message: "Product deleted"
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || err
    });
  }
});

// Update product - accept new images with same validation
router.put("/:id", verifyToken, verifyAdmin, upload.array("images", MAX_FILES), async (req, res) => {
  try {
    if (req.files && req.files.length > MAX_FILES) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${MAX_FILES} files allowed`
      });
    }
    const existingImages = req.body.existingImages ? (() => {
      try { return JSON.parse(req.body.existingImages); } catch (e) { return []; }
    })() : [];

    let UploadResult = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        if (!file || !file.buffer) continue;
        const url = await cloudinary.uploadImage(file);
        UploadResult.push(url);
      }
    }

    const finalImages = [...existingImages, ...UploadResult];
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name,
        description: req.body.description,
        images: finalImages,
        brand: req.body.brand,
        price: req.body.price,
        category: req.body.category,
        oldPrice: req.body.oldPrice,
        discount: req.body.discount,
        subcategory: req.body.subcategory,
        countInStock: req.body.countInStock,
        rating: req.body.rating,
        numReviews: req.body.numReviews,
        isFeatured: req.body.isFeatured
      },
      { new: true }
    );

    if (!product) return res.status(404).json({
      success: false,
      message: "Product not found"
    });
    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || err
    });
  }
});



// Delete all products
router.delete("/delete-all", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await Product.deleteMany({});
    res.status(200).json({
      success: true,
      message: `${result.deletedCount} products deleted successfully`,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || err
    });
  }
});

module.exports = router;
