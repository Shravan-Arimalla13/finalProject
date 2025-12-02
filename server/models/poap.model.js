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
            longitude: Number
        },
        
        isRevoked: { type: Boolean, default: false },
        issuer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }, { timestamps: true });

    module.exports = mongoose.model('POAP', poapSchema);