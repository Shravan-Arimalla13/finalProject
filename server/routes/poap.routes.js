// In server/routes/poap.routes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const { isAdminOrFaculty, isStudent } = require('../middleware/role.middleware');

// --- CRITICAL FIX: Ensure all six functions are imported from the controller ---
const {
    generateEventQR, 
    claimPOAP, 
    getMyPOAPs,
    verifyPOAP,
    getEventAttendance,
    revokePOAP
} = require('../controllers/poap.controller'); 
// --------------------------------------------------------------------------

// --- ROUTES ---

// Faculty: Generate QR (for check-in)
router.get(
    '/event/:eventId/qr',
    [authMiddleware, isAdminOrFaculty],
    generateEventQR
);

// Faculty: View Attendance Report
router.get(
    '/event/:eventId/attendance',
    [authMiddleware, isAdminOrFaculty],
    getEventAttendance
);

// Student: Claim POAP
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

// Public: Verify POAP
router.get('/verify/:tokenId', verifyPOAP);

// Admin: Revoke POAP
router.post(
    '/revoke',
    [authMiddleware, isAdminOrFaculty],
    revokePOAP
);

module.exports = router;