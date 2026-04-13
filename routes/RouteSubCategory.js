const express = require("express");
const router = express.Router();
const { subCategory } = require("../models/subCategory");
const verifyToken = require("../middlewares/jwt");
const { verifyAdmin } = require("../middlewares/jwt");

router.post("/create", verifyToken, verifyAdmin, async (req, res) => {
    try {

        const subcategory = new subCategory({
            category: req.body.category,
            name: req.body.name,
        });
        const data = await subcategory.save();
        return res.status(200).json({
            success: true,
            subcategory: data,
            message: "Data saved successfully"
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message || err
        });
    }
});

router.get("/", async (req, res) => {
    try {
        const totalPosts = await subCategory.countDocuments();

        const page = parseInt(req.query.page) || 1;
        const perPage = 6;
        const totalPages = totalPosts === 0 ? 1 : Math.ceil(totalPosts / perPage);
        if (page < 1 || page > totalPages) {
            return res.status(404).json({
                success: false,
                message: "Page not found"
            });
        }
        const data = await subCategory.find().skip((page - 1) * perPage).limit(perPage).exec();
        if (!data) {
            return res.status(500).json({
                success: false,
                message: "Category list not found"
            });
        }
        res.status(200).json({
            success: true,
            subCategoryList: data,
            totalDocs: totalPosts,
            totalPages: totalPages,
            page: page,
            message: "Data fetched successfully"
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message || err
        });
    }
});

// Get subcategory by ID
router.get("/:id", async (req, res) => {
    try {
        const data = await subCategory.findById(req.params.id).populate("category");
        if (!data) {
            return res.status(404).json({
                success: false,
                message: "SubCategory not found"
            });
        }
        return res.status(200).json({
            success: true,
            subCategory: data,
            message: "SubCategory fetched successfully"
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: err.message || err
        });
    }
});

// Update subcategory
router.put("/:id", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const data = await subCategory.findByIdAndUpdate(
            req.params.id,
            {
                name: req.body.name,
                category: req.body.category,
            },
            { new: true }
        );
        if (!data) {
            return res.status(404).json({
                success: false,
                message: "SubCategory not found"
            });
        }
        return res.status(200).json({
            success: true,
            subCategory: data,
            message: "SubCategory updated successfully"
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: err.message || err
        });
    }
});

// Delete subcategory by ID
router.delete("/delete/:id", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const data = await subCategory.findByIdAndDelete(req.params.id);
        if (!data) {
            return res.status(404).json({
                success: false,
                message: "SubCategory not found"
            });
        }
        return res.status(200).json({
            success: true,
            message: "SubCategory deleted successfully"
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: err.message || err
        });
    }
});

// Delete all subcategories
router.delete("/delete-all", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const result = await subCategory.deleteMany({});
        return res.status(200).json({
            success: true,
            message: `${result.deletedCount} subcategories deleted successfully`
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: err.message || err
        });
    }
});

module.exports = router;