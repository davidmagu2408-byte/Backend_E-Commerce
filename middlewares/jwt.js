const jwt = require("jsonwebtoken");
const { User } = require("../models/user");

const verifyToken = (req, res, next) => {
    const token = req.header("accessToken") || req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return res.status(401).send({
        success: false,
        message: "Access Denied"
    });
    try {
        const verified = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Token Expired",
                isExpired: true // Optional: helper flag for frontend
            });
        }

        // Return 403 for actually malicious or malformed tokens
        return res.status(403).json({
            success: false,
            message: "Invalid Token"
        });
    }
}

const verifyAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user || !user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Admin access required"
            });
        }
        next();
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: err.message
        });
    }
};

module.exports = verifyToken;
module.exports.verifyAdmin = verifyAdmin;
