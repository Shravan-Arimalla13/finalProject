// server/models/poap.model.js
const mongoose = require('mongoose');

const poapSchema = new mongoose.Schema({
    tokenId: { type: String, required: true, unique: true },
    transactionHash: { type: String, required: true },
    eventHash: { type: String, required: true },
    
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    eventName: { type: String, required: true },
    eventDate: { type: Date, required: true },
    
    studentWallet: { type: String, required: true, lowercase: true },
    studentEmail: { type: String, required: true },
    studentName: { type: String, required: true },
    
    checkInTime: { type: Date, default: Date.now },
    checkInLocation: {
        latitude: Number,
        longitude: Number,
        accuracy: Number
    },
    
    attendanceScore: { type: Number, default: 100, min: 0, max: 100 },
    
    isRevoked: { type: Boolean, default: false },
    revokedAt: { type: Date },
    revokeReason: { type: String },
    
    issuer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Indexes for performance
poapSchema.index({ studentWallet: 1, eventHash: 1 }, { unique: true });
poapSchema.index({ eventId: 1 });
poapSchema.index({ studentEmail: 1 });

module.exports = mongoose.model('POAP', poapSchema);