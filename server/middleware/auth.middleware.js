// In server/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    // 1. Get token from the 'Authorization' header
    //    It's expected in the format: "Bearer <token>"
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1]; // Get just the token part

    // 2. Check if token exists
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // 3. Verify the token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 4. If valid, add user's data to the request object
        req.user = decoded.user; // This 'user' is the payload we created in login
        next(); // Move on to the next function (the actual route)

    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

module.exports = authMiddleware;