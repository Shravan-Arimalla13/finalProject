// In server/routes/poap.routes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const { isAdminOrFaculty, isStudent } = require('../middleware/role.middleware'); // <-- IMPORT CHECKS

// Import Controller Functions
const { 
    generateEventQR, 
    claimPOAP, 
    getMyPOAPs,
    verifyPOAP,
    getEventAttendance,
    revokePOAP
} = require('../controllers/poap.controller');

// --- ROUTES ---

// Faculty: Generate QR
router.get(
    '/event/:eventId/qr',
    [authMiddleware, isAdminOrFaculty], // <-- Ensure these are defined
    generateEventQR
);

// Faculty: View Attendance
router.get(
    '/event/:eventId/attendance',
    [authMiddleware, isAdminOrFaculty],
    getEventAttendance
);

// Student: Claim
router.post(
    '/claim',
    [authMiddleware, isStudent],
    claimPOAP
);

// Student: View My POAPs
router.get(
    '/my-poaps',
    [authMiddleware, isStudent],
    getMyPOAPs
);

// Public: Verify
router.get('/verify/:tokenId', verifyPOAP);

// Admin: Revoke
router.post(
    '/revoke',
    [authMiddleware, isAdminOrFaculty],
    revokePOAP
);

module.exports = router;