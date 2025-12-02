// In server/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const { claimFacultyInvite, requestStudentActivation, activateStudentAccount,getNonce, // <-- ADD
    verifySignature,requestPasswordReset, 
    resetPassword } = require('../controllers/auth.controller');

// Public route to claim an invite and create a faculty account
router.post('/claim-invite', claimFacultyInvite);

// We will add the student activation route here later
// --- NEW STUDENT ROUTE ---
router.post('/request-student-activation', requestStudentActivation);

// --- NEW STUDENT ACTIVATION (STEP 2) ---
router.post('/activate-student-account', activateStudentAccount);


// --- NEW SIWE ROUTES (FOR STUDENT LOGIN) ---
router.get('/nonce', getNonce);
router.post('/verify-signature', verifySignature);

// --- PASSWORD RESET ROUTES ---
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);

module.exports = router;