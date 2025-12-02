// In server/routes/user.routes.js
const express = require('express');
const router = express.Router();
const { 
    registerUser, 
    loginUser, 
    getUserProfile,
    addStudent,
    getAllStudents,
    deleteStudent ,// <-- Ensure this is imported
    saveWalletAddress,
    getAllFaculty
} = require('../controllers/user.controller');

const authMiddleware = require('../middleware/auth.middleware');
// We need checkRole to handle the new 'SuperAdmin' role correctly
const { checkRole } = require('../middleware/role.middleware');

// --- Public Routes ---
router.post('/register', registerUser);
router.post('/login', loginUser);


// --- Protected Routes ---
router.get('/profile', authMiddleware, getUserProfile);

// --- NEW ROUTE ---
router.post('/save-wallet', [authMiddleware, checkRole(['Student'])], saveWalletAddress);
// ...
// --- Student Management Routes ---
// ALLOWED: SuperAdmin (can manage all) OR Faculty (can manage own dept)

router.post(
    '/students', 
    [authMiddleware, checkRole(['SuperAdmin', 'Faculty'])], 
    addStudent
);

router.get(
    '/students', 
    [authMiddleware, checkRole(['SuperAdmin', 'Faculty'])], 
    getAllStudents
);

// --- Faculty Management Routes ---
router.get(
    '/faculty', 
    [authMiddleware, checkRole(['SuperAdmin'])], 
    getAllFaculty
);

// Only SuperAdmin should probably be deleting students, 
// but you can add 'Faculty' here if you want them to delete too.
router.delete(
    '/students/:id', 
    [authMiddleware, checkRole(['SuperAdmin', 'Faculty'])], 
    deleteStudent
);

module.exports = router;