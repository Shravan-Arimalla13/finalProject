const express = require('express');
const router = express.Router();

// 1. Import the entire controller object
const quizController = require('../controllers/quiz.controller');

// 2. Import middlewares
const authMiddleware = require('../middleware/auth.middleware');
const { checkRole } = require('../middleware/role.middleware');

// --- ROUTES ---

// Student: List quizzes
router.get('/list', authMiddleware, quizController.getAvailableQuizzes);

// Student: Get details for start screen
router.get('/:quizId/details', authMiddleware, quizController.getQuizDetails);

// Student: AI Adaptive Next Question
router.post('/next', authMiddleware, quizController.nextQuestion);

// Student: Final Submit
router.post('/submit', authMiddleware, quizController.submitQuiz);

// Faculty: Create Quiz
router.post('/create', authMiddleware, checkRole(['Faculty', 'SuperAdmin']), quizController.createQuiz);

module.exports = router;