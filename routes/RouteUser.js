const { User } = require("../models/user");
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const verifyToken = require("../middlewares/jwt");
const rateLimit = require('express-rate-limit');
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minute window
    max: 5, // Limit each IP to 5 login/register attempts per window
    message: {
        status: 429,
        error: "Too many attempts. Please try again after 15 minutes."
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

router.post("/register", authLimiter, async (req, res) => {
    try {
        let user = await User.findOne({ email: req.body.email.trim() });
        if (user) {
            return res.status(400).json({
                "success": false,
                "message": "User already registered."
            });
        }
        user = new User({
            name: req.body.name.trim(),
            email: req.body.email.trim(),
            password: req.body.password.trim(),
            phone: req.body.phone.trim(),
            address: req.body.address.trim(),
            isAdmin: false,
        });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
        await user.save();
        res.status(200).send({
            "success": true,
            "message": "User registered successfully",
        });
    } catch (err) {
        res.status(500).send({
            "success": false,
            "error": err.message || err
        });
    }
});

router.post("/login", authLimiter, async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(400).send({
                "success": false,
                "message": "Tài khoản không tồn tại."
            });
        }

        const validPassword = await bcrypt.compare(req.body.password, user.password);
        if (!validPassword) {
            return res.status(400).send({
                "success": false,
                "message": "Mật khẩu không đúng."
            });
        }

        const accessToken = jwt.sign({ _id: user._id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
        const refreshToken = jwt.sign({ _id: user._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });
        user.refreshToken = refreshToken;
        await user.save();
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true, // JS không thể đọc được
            secure: process.env.NODE_ENV === 'production',   // Chỉ gửi qua HTTPS (trong production)
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: '/', // Chống tấn công CSRF
            maxAge: 7 * 24 * 60 * 60 * 1000 // Hết hạn sau 7 ngày
        });
        const userResponse = user.toObject();
        delete userResponse.password;
        delete userResponse.refreshToken;

        res.status(200).send({
            success: true,
            message: "Đăng nhập thành công.",
            user: userResponse, // Clean object
            accessToken,
        });
    } catch (err) {
        res.status(500).send({
            "success": false,
            "error": err.message || err
        });
    }
})

router.post("/logout", verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(400).send({
                "success": false,
                "message": "User not found."
            });
        }
        user.refreshToken = ""; // Kill the session
        await user.save();
        res.clearCookie("refreshToken", {
            httpOnly: true,
            path: "/",
            // Dynamically set based on environment to match login flow
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
        });

        return res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });
    } catch (err) {
        res.status(500).send(err.message);
        console.log(err);
    }
});

router.get("/refresh-token", async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            return res.status(401).json({
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
        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
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

router.get("/profile", verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("-password");
        res.status(200).send({
            "success": true,
            "user": user,
            "message": "User profile fetched successfully"
        });
    } catch (err) {
        res.status(500).send({
            "success": false,
            "error": err.message || err
        });
    }
});

router.put("/update", verifyToken, async (req, res) => {
    try {
        const { name, email, password, phone, address } = req.body;

        let user = await User.findById(req.user._id);
        if (!user) return res.status(400).send({ success: false, message: "User not found." });

        if (name) user.name = name;
        if (email) user.email = email;
        if (phone) user.phone = phone;
        if (address) user.address = address;

        // Only re-hash if a new password is provided
        if (password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        await user.save();

        const updatedUser = user.toObject();
        delete updatedUser.password;
        delete updatedUser.refreshToken;

        res.status(200).send({
            success: true,
            message: "User updated successfully",
            user: updatedUser
        });
    } catch (err) {
        res.status(500).send({ success: false, error: err.message });
    }
});

module.exports = router;