const express = require('express');
const router = express.Router();

const quizController = require('../controllers/quiz.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { checkRole } = require('../middleware/role.middleware');

router.get('/list', authMiddleware, quizController.getAvailableQuizzes);
router.get('/:quizId/details', authMiddleware, quizController.getQuizDetails);
router.post('/next', authMiddleware, quizController.nextQuestion);
router.post('/submit', authMiddleware, quizController.submitQuiz);
router.post('/create', authMiddleware, checkRole(['Faculty', 'SuperAdmin']), quizController.createQuiz);

module.exports = router;