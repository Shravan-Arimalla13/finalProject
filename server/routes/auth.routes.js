// In server/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');

// --- CRITICAL FIX: Ensure all functions are imported ---
const {
    claimFacultyInvite, // <-- MUST BE PRESENT
    requestStudentActivation,
    activateStudentAccount,
    getNonce,
    verifySignature,
    requestPasswordReset,
    resetPassword
} = require('../controllers/auth.controller');
// -----------------------------------------------------

// --- 1. Claim Faculty Invite ---
router.post('/claim-invite', claimFacultyInvite); // This line crashed because claimFacultyInvite was undefined

// --- 2. Student Activation ---
router.post('/request-student-activation', requestStudentActivation);
router.post('/activate-student-account', activateStudentAccount);

// --- 3. SIWE / Wallet Auth ---
router.get('/nonce', getNonce);
router.post('/verify-signature', verifySignature);

// --- 4. Password Reset ---
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);

module.exports = router;