// In server/routes/quiz.routes.js
const express = require('express');
const router = express.Router();

// --- IMPORT ALL FUNCTIONS ---
const { 
    createQuiz, 
    getAvailableQuizzes, 
    nextQuestion, 
    submitQuiz,
    getQuizDetails // <-- MAKE SURE THIS IS HERE
} = require('../controllers/quiz.controller');

const authMiddleware = require('../middleware/auth.middleware');
const { checkRole } = require('../middleware/role.middleware');

// --- ROUTES ---

// Faculty: Create a new quiz
router.post(
    '/create', 
    [authMiddleware, checkRole(['Faculty', 'SuperAdmin'])], 
    createQuiz
);

// Student: List available quizzes
router.get(
    '/list', 
    authMiddleware, 
    getAvailableQuizzes
);

// Student: Get Quiz Details (Start Screen)
// --- THIS WAS LIKELY MISSING ---
router.get(
    '/:quizId/details', 
    authMiddleware, 
    getQuizDetails
);
// ------------------------------

// Student: Get next adaptive question
router.post(
    '/next', 
    authMiddleware, 
    nextQuestion
);

// Student: Submit final score
router.post(
    '/submit', 
    authMiddleware, 
    submitQuiz 
);

module.exports = router;