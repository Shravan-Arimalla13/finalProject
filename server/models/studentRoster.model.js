// In server/models/studentRoster.model.js
const mongoose = require('mongoose');

const studentRosterSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true, // No two emails in the roster
        lowercase: true 
    },
    usn: {
        type: String,
        required: true,
        unique: true // No two USNs in the roster
    },
    department: {
        type: String,
        required: true
    },
    semester: { type: String },
    year: {
        type: Number,
        required: true
    },
    // We don't store a password here. This is just an invite.
}, { timestamps: true });

const StudentRoster = mongoose.model('StudentRoster', studentRosterSchema);

module.exports = StudentRoster;