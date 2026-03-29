const jwt = require("jsonwebtoken");
const express = require("express");
const router = express.Router();

router.post("/refresh-token", async (req, res) => {
    try {
        const refreshToken = req.body.refreshToken;
        if (!refreshToken) {
            return res.status(400).json({
                "success": false,
                "message": "Refresh token is required"
            });
        }
        const user = await User.findOne({ refreshToken });
        if (!user) {
            return res.status(400).json({
                "success": false,
                "message": "Invalid refresh token"
            });
        }
        jwt.verify(refreshToken, process.env.REFRESH_SECRET_TOKEN, (err, decoded) => {
            if (err) {
                return res.status(403).json({
                    "success": false,
                    "message": "Forbidden"
                });
            }
            const accessToken = jwt.sign({ _id: user._id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
            res.status(200).json({
                "success": true,
                "message": "Token refreshed successfully",
                accessToken
            });
        });
    } catch (err) {
        res.status(500).json({
            "success": false,
            "error": err.message || err
        });
    }
});

module.exports = router;

