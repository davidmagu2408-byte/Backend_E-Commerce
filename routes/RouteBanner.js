const express = require("express");
const { Banner } = require("../models/banner");
const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const bannerList = await Banner.find();
        if (!bannerList) {
            res.status(500).json({ "success": false, "message": "Data not found" });
        }
        res.status(200).json({
            "success": true,
            "bannerList": bannerList,
        });
    } catch (err) {
        res.status(500).json({
            "success": false,
            "error": err.message || err
        });
    }
});

router.get("/:id", async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id);
        if (!banner) {
            res.status(500).json({
                "success": false,
                "message": "Data not found"
            });
        }
        res.status(200).json({
            "success": true,
            "banner": banner,
        });
    } catch (err) {
        res.status(500).json({
            "success": false,
            "error": err.message || err
        });
    }
});

router.post("/create", async (req, res) => {
    try {
        const banner = new Banner({
            name: req.body.name,
            images: req.body.images,
            type: req.body.type,
        });
        const data = await banner.save();
        return res.status(200).json({
            "success": true,
            "banner": data,
            "message": "Data saved successfully"
        });
    } catch (err) {
        res.status(500).json({
            "success": false,
            "error": err.message || err
        });
    }
});

module.exports = router;