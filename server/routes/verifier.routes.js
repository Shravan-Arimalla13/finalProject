// In server/routes/verifier.routes.js
const express = require('express');
const router = express.Router();
const { searchCredentials } = require('../controllers/verifier.controller');

// A public route for employers to search for credentials
router.get('/search', searchCredentials);

module.exports = router;