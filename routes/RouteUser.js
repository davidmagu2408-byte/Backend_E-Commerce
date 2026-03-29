const { User } = require("../models/user");
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const verifyToken = require("../middlewares/jwt");

router.post("/register", async (req, res) => {
    try {
        console.log(req.body)
        let user = await User.findOne({ email: req.body.email });
        if (user) {
            return res.status(400).json({
                "success": false,
                "message": "User already registered."
            });
        }
        user = new User({
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
            phone: req.body.phone,
            address: req.body.address,
            isAdmin: req.body.isAdmin,
            oldPassword: req.body.oldPassword
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

router.post("/login", async (req, res) => {
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
            secure: true,   // Chỉ gửi qua HTTPS (trong production)
            sameSite: 'strict', // Chống tấn công CSRF
            maxAge: 7 * 24 * 60 * 60 * 1000 // Hết hạn sau 7 ngày
        });
        res.status(200).send({
            "success": true,
            "message": "Đăng nhập thành công.",
            "user": {
                "name": user.name,
                "email": user.email,
                "isAdmin": user.isAdmin
            },
            accessToken,
            refreshToken,
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
        user.refreshToken = ""; // Kill the session
        await user.save();
        res.clearCookie("refreshToken", {
            httpOnly: true,
            sameSite: "strict",
            secure: true
        });
        res.status(200).json({
            "success": true,
            "message": "Logged out successfully"
        });
    } catch (err) {
        res.status(500).send(err.message);
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
        const user = await User.findByIdAndUpdate(req.user._id, {
            name: req.body.name,
            email: req.body.email,
            oldPassword: password,
            password: req.body.password,
            phone: req.body.phone,
            address: req.body.address
        }, { new: true });
        if (!user) {
            return res.status(400).send({
                "success": false,
                "message": "User not found."
            });
        }
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
        await user.save();
        res.status(200).send({
            "success": true,
            "message": "User updated successfully",
            "user": user
        });
    } catch (err) {
        res.status(500).send({
            "success": false,
            "error": err.message || err
        });
    }
});

module.exports = router;