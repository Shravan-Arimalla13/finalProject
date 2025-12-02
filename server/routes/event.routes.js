// In server/routes/event.routes.js
const express = require('express');
const router = express.Router();

// --- THIS IS THE IMPORT LIST THAT MUST BE 100% CORRECT ---
const { 
    createEvent, 
    getAllEvents, 
    getEventById, 
    registerForEvent,
    getEventParticipants,
    getPublicEvents,
    registerMeForEvent 
} = require('../controllers/event.controller');
// ---

const authMiddleware = require('../middleware/auth.middleware');
const { isAdminOrFaculty, isStudent } = require('../middleware/role.middleware');

// --- Protected Routes (Admin/Faculty) ---
router.post('/', [authMiddleware, isAdminOrFaculty], createEvent);
router.get('/', [authMiddleware, isAdminOrFaculty], getAllEvents);
router.get('/:id/participants', [authMiddleware, isAdminOrFaculty], getEventParticipants);

// --- Protected Routes (Student) ---
router.get('/public-list', [authMiddleware, isStudent], getPublicEvents); // <-- This is line 23
router.post('/:id/register-me', [authMiddleware, isStudent], registerMeForEvent);

// --- Public Routes ---
router.get('/:id', getEventById);
router.post('/:id/register', registerForEvent);

module.exports = router;