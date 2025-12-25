const express = require('express');
const router = express.Router();

// Import Controller
const quizController = require('../controllers/quiz.controller');

// Import Middleware
const authMiddleware = require('../middleware/auth.middleware');
const { checkRole } = require('../middleware/role.middleware');

// --- ROUTES ---

// Faculty only
router.post('/create', authMiddleware, checkRole(['Faculty', 'SuperAdmin']), quizController.createQuiz);

// Student routes
router.get('/list', authMiddleware, quizController.getAvailableQuizzes);
router.get('/:quizId/details', authMiddleware, quizController.getQuizDetails);
router.post('/next', authMiddleware, quizController.nextQuestion);
router.post('/submit', authMiddleware, quizController.submitQuiz);

module.exports = router;