// In server/routes/certificate.routes.js
const express = require('express');
const router = express.Router();
const { 
    issueSingleCertificate,
    issueEventCertificates,
    verifyCertificate,
    revokeCertificate,
    getMyCertificates,
    downloadCertificate
} = require('../controllers/certificate.controller');

const authMiddleware = require('../middleware/auth.middleware');
const { isAdminOrFaculty, isStudent } = require('../middleware/role.middleware');

// --- PUBLIC VERIFICATION ROUTE ---
router.get(
    '/verify/:certId',
    verifyCertificate
);

// --- PUBLIC DOWNLOAD ROUTE ---
router.get(
    '/download/:certId',
    downloadCertificate
);

// --- Student Route ---
router.get(
    '/my-certificates',
    [authMiddleware, isStudent],
    getMyCertificates
);

// --- Admin/Faculty Routes ---
router.post(
    '/issue/event/:eventId',
    [authMiddleware, isAdminOrFaculty],
    issueEventCertificates
);

router.post(
    '/issue/single',
    [authMiddleware, isAdminOrFaculty],
    issueSingleCertificate
);

router.post(
    '/revoke',
    [authMiddleware, isAdminOrFaculty],
    revokeCertificate
);

module.exports = router;