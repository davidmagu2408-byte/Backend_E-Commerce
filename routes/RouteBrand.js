const express = require("express");
const { Brand } = require("../models/brand");
const router = express.Router();
const verifyToken = require("../middlewares/jwt");
const { verifyAdmin } = require("../middlewares/jwt");

router.get("/", async (req, res) => {
    try {
        const brandList = await Brand.find().populate("subcategory");
        res.status(200).json({
            success: true,
            brandList: brandList,
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
        const brand = await Brand.findById(req.params.id).populate("subcategory");
        if (!brand) {
            return res.status(404).json({
                success: false,
                message: "Brand not found"
            });
        }
        res.status(200).json({
            success: true,
            brand: brand,
            message: "Data fetched successfully"
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message || err
        });
    }
});

router.post("/create", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const brand = new Brand({
            name: req.body.name,
            subcategory: req.body.subcategory,
        });
        const data = await brand.save();
        return res.status(200).json({
            success: true,
            brand: data,
            message: "Data saved successfully"
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message || err
        });
    }
});

router.put("/:id", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const brand = await Brand.findByIdAndUpdate(
            req.params.id,
            {
                name: req.body.name,
                subcategory: req.body.subcategory,
            },
            { new: true }
        );
        if (!brand) {
            return res.status(404).json({
                success: false,
                message: "Brand not found"
            });
        }
        return res.status(200).json({
            success: true,
            brand: brand,
            message: "Brand updated successfully"
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message || err
        });
    }
});

router.delete("/delete/:id", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const brand = await Brand.findByIdAndDelete(req.params.id);
        if (!brand) {
            return res.status(404).json({
                success: false,
                message: "Brand not found"
            });
        }
        return res.status(200).json({
            success: true,
            message: "Brand deleted successfully"
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message || err
        });
    }
});

module.exports = router;

