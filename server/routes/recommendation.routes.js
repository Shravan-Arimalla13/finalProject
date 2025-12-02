// In server/routes/recommendation.routes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const recommendationService = require('../services/recommendation.service');

// GET /api/recommendations/me
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const recommendations = await recommendationService.getRecommendations(
            req.user.email
        );
        res.json(recommendations);
    } catch (error) {
        console.error('Recommendation error:', error);
        res.status(500).json({ message: 'Failed to generate recommendations' });
    }
});

module.exports = router;