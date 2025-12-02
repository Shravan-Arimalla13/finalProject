// In server/models/user.model.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    role: {
        type: String,
        enum: ['Student', 'Faculty', 'SuperAdmin'], // Our new, explicit roles
        required: true
    },
    department: {
        type: String,
        required: true // The "firewall" for data scoping
    },
    semester: { type: String },
    usn: {
        type: String,
        unique: true,
        sparse: true  // Allows 'null' for non-student users
    },
isVerified: {
        type: Boolean,
        default: false
    },
    walletAddress: { // <-- ADD THIS
        type: String,
        unique: true,
        sparse: true // Allows multiple 'null'
    },
    nonce: { // <-- ADD THIS
        type: String,
        default: () => Math.floor(Math.random() * 1000000).toString(),
        required: true
    }
}, { timestamps: true });
const User = mongoose.model('User', userSchema);

module.exports = User;