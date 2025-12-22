// server/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/claim-invite', authController.claimFacultyInvite);
router.get('/nonce', authController.getNonce);
router.post('/verify-signature', authController.verifySignature);
router.post('/request-student-activation', authController.requestStudentActivation);
router.post('/activate-student-account', authController.activateStudentAccount);
router.post('/forgot-password', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);

module.exports = router;