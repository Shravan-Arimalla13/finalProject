const express = require('express');
const router = express.Router();

// 1. Import Controller Functions
const { 
    createQuiz, 
    getAvailableQuizzes, 
    nextQuestion, 
    submitQuiz,
    getQuizDetails 
} = require('../controllers/quiz.controller');

// 2. Import Auth Middleware (Direct Function Import)
const authMiddleware = require('../middleware/auth.middleware');

// 3. Import Role Middleware (Object Destructuring Import)
const { checkRole, isAdminOrFaculty } = require('../middleware/role.middleware');

// --- ROUTES ---

// Faculty: Create a new quiz
router.post(
    '/create', 
    authMiddleware, 
    isAdminOrFaculty, // Using the pre-defined helper from your role.middleware
    createQuiz
);

// Student: List available quizzes
router.get(
    '/list', 
    authMiddleware, 
    getAvailableQuizzes
);

// Student: Get Quiz Details
router.get(
    '/:quizId/details', 
    authMiddleware, 
    getQuizDetails
);

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