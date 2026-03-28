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
            return res.status(400).send({
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
        const token = jwt.sign({ _id: user._id }, process.env.TOKEN_SECRET, { expiresIn: "1h" });
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
                "message": "User not found."
            });
        }
        const validPassword = await bcrypt.compare(req.body.password, user.password);
        if (!validPassword) {
            return res.status(400).send("Invalid password.");
        }
        const token = jwt.sign({ _id: user._id }, process.env.TOKEN_SECRET, { expiresIn: "3h" });
        res.status(200).send({
            "success": true,
            "message": "User logged in successfully",
            "name": user.name,
            "email": user.email,
            token,
            "isAdmin": user.isAdmin
        });
    } catch (err) {
        res.status(500).send({
            "success": false,
            "error": err.message || err
        });
    }
})

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