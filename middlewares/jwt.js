const jwt = require("jsonwebtoken");

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

module.exports = verifyToken;
