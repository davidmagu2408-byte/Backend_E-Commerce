const express = require("express");
const { Banner } = require("../models/banner");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("../utils/cloudinary");

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

router.get("/", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const perPage = 6;
        const totalPosts = await Banner.countDocuments();
        const totalPages = totalPosts === 0 ? 1 : Math.ceil(totalPosts / perPage);
        if (page < 1 || page > totalPages) {
            return res.status(404).json({
                success: false,
                message: "Page not found"
            });
        }
        const bannerList = await Banner.find().skip((page - 1) * perPage).limit(perPage).exec();
        res.status(200).json({
            success: true,
            bannerList: bannerList,
            totalPages: totalPages,
            page: page
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message || err
        });
    }
});

router.get("/:id", async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id);
        if (!banner) {
            return res.status(404).json({
                success: false,
                message: "Banner not found"
            });
        }
        res.status(200).json({
            success: true,
            banner: banner,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message || err
        });
    }
});

router.post("/create", (req, res, next) => {
    upload.array("images", MAX_FILES)(req, res, (err) => {
        if (err) {
            return res.status(400).json({
                success: false,
                message: err.message || "File upload error"
            });
        }
        next();
    });
}, async (req, res) => {
    try {
        const uploadedImages = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const url = await cloudinary.uploadImage(file);
                uploadedImages.push(url);
            }
        }
        const banner = new Banner({
            name: req.body.name,
            images: uploadedImages,
            type: req.body.type,
        });
        const data = await banner.save();
        return res.status(200).json({
            success: true,
            banner: data,
            message: "Banner created successfully"
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message || err
        });
    }
});

router.delete("/delete/:id", async (req, res) => {
    try {
        const banner = await Banner.findByIdAndDelete(req.params.id);
        if (!banner) {
            return res.status(404).json({
                success: false,
                message: "Banner not found"
            });
        }
        res.status(200).json({
            success: true,
            message: "Banner deleted successfully"
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message || err
        });
    }
});

module.exports = router;