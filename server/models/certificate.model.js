// In server/models/certificate.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const certificateSchema = new mongoose.Schema({
    certificateId: { // Our unique, public-facing ID
        type: String,
        required: true,
        unique: true
    },
    tokenId: { // --- NEW: The NFT's ID on the blockchain ---
        type: Number, 
        required: true
    },
    certificateHash: { // --- NEW: The 64-char hash ---
        type: String,
        required: true,
        unique: true
    },
    transactionHash: { // The TX hash (proof of minting)
        type: String
    },
    studentName: {
        type: String,
        required: true
    },
    studentEmail: {
        type: String,
        required: true
    },
    eventName: {
        type: String,
        required: true
    },
    eventDate: {
        type: Date,
        required: true
    },
    issuedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    verificationUrl: {
        type: String,
        required: true
    },
    // --- ADD THIS NEW FIELD ---
    scanCount: {
        type: Number,
        default: 0 // Starts at 0
    }
}, { timestamps: true });

// Add a compound index to prevent issuing the same cert for the same event
certificateSchema.index({ eventName: 1, studentEmail: 1 }, { unique: true });

const Certificate = mongoose.model('Certificate', certificateSchema);
module.exports = Certificate;