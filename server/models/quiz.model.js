// In server/models/quiz.model.js
const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
    topic: { type: String, required: true },
    description: { type: String },
    totalQuestions: { type: Number, default: 15 },
    passingScore: { type: Number, default: 60 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    department: { type: String, required: true }, // <-- NEW: Scoped to branch
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Optimized for fast lookups in the "Available Quizzes" list
quizSchema.index({ isActive: 1, department: 1 });

module.exports = mongoose.model('Quiz', quizSchema);