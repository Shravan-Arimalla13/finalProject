// server/routes/auth.routes.js - COMPLETE VERSION
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// --- FACULTY INVITE ---
router.post('/claim-invite', authController.claimFacultyInvite);

// --- SIWE (Wallet Login) ---
router.get('/nonce', authController.getNonce);
router.post('/verify-signature', authController.verifySignature);

// --- STUDENT ACTIVATION ---
router.post('/request-student-activation', authController.requestStudentActivation);
router.post('/activate-student-account', authController.activateStudentAccount);

// --- PASSWORD RESET ---
router.post('/forgot-password', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);

module.exports = router;