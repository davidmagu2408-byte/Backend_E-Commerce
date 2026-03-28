const express = require("express");
const router = express.Router();
const { subCategory } = require("../models/subCategory");

router.post("/create", async (req, res) => {
    try {

        const subcategory = new subCategory({
            category: req.body.category,
            name: req.body.name,
        });
        const data = await subcategory.save();
        return res.status(200).json({
            "success": true,
            "subcategory": data,
            "message": "Data saved successfully"
        });
    } catch (err) {
        res.status(500).json({
            "success": false,
            "error": err.message || err
        });
    }
});

router.get("/", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const perPage = 6;
        const totalPosts = await subCategory.countDocuments();
        const totalPages = totalPosts === 0 ? 1 : Math.ceil(totalPosts / perPage);
        if (page < 1 || page > totalPages) {
            return res.status(404).json({
                "success": false,
                "message": "Page not found"
            });
        }
        const data = await subCategory.find().skip((page - 1) * perPage).limit(perPage).exec();
        const subData = await subCategory.find();
        if (!data) {
            res.status(500).json({
                "success": false,
                "message": "SubCategory list not found"
            });
        } else {
            res.status(200).json({
                "success": true,
                "subCategoryList": data,
                "subCategory": subData,
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

module.exports = router;