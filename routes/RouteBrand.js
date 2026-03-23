const express = require("express");
const { Brand } = require("../models/brand");
const router = express.Router();



router.get("/", async (req, res) => {
    try {
        const brandList = await Brand.find();
        if (!brandList) {
            res.status(500).json({ success: false });
        }
        res.status(200).json({
            "success": true,
            "brandList": brandList,
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message || err });
    }
});

router.post("/create", async (req, res) => {
    try {

        const brand = new Brand({
            name: req.body.name,
            subcategory: req.body.subcategory,
        });
        const data = await brand.save();
        return res.status(201).json({
            "success": true,
            "brand": data,
            "message": "Data saved successfully"
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message || err });
    }
}
)


module.exports = router;

