const express = require('express');
    const router = express.Router();
    const auth = require('../middleware/auth.middleware');
    const { generateQR, claimPOAP, getMyPOAPs } = require('../controllers/poap.controller');

    router.get('/event/:eventId/qr', auth, generateQR);
    router.post('/claim', auth, claimPOAP);
    router.get('/my-poaps', auth, getMyPOAPs);

    module.exports = router;