const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
    const token = req.header("accessToken") || req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return res.status(401).send("Access Denied");
    try {
        const verified = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
            if (err) return res.status(400).send("Invalid Token");
            return user;
        });
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).send("Invalid Token");
    }
}

module.exports = verifyToken;
