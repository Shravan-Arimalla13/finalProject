// In server/middleware/role.middleware.js

// This is a higher-order function. It takes roles as an argument
// and returns a middleware function.
const checkRole = (roles) => {
    return (req, res, next) => {
        // We assume authMiddleware has already run and attached 'req.user'
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Forbidden: You do not have the required permissions.' });
        }
        // User has the correct role, proceed
        next();
    }
}

// We can pre-define specific role checks for convenience
const isAdmin = checkRole(['Admin']);
const isFaculty = checkRole(['Faculty']);
const isAdminOrFaculty = checkRole(['SuperAdmin', 'Faculty']);
const isStudent = checkRole(['Student']);

module.exports = {
    isAdmin,
    isFaculty,
    isAdminOrFaculty,
    isStudent,
    checkRole
};

