// In server/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const { inviteFaculty, importStudentRoster,getAnalytics } = require('../controllers/admin.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { checkRole } = require('../middleware/role.middleware');
const upload = require('../middleware/upload.middleware');

// This route is protected by auth AND a role check for 'SuperAdmin'
router.post(
    '/invite-faculty',
    [authMiddleware, checkRole(['SuperAdmin'])],
    inviteFaculty
);


// --- NEW ANALYTICS ROUTE ---
router.get(
    '/analytics',
    [authMiddleware, checkRole(['SuperAdmin'])],
    getAnalytics
);      

// --- NEW ROSTER UPLOAD ROUTE ---
router.post(
    '/import-roster',
    [authMiddleware, checkRole(['SuperAdmin']), upload], // <-- Use the upload middleware
    importStudentRoster
);

module.exports = router;