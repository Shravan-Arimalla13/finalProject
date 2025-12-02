// In server/models/systemLog.model.js
const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema({
    action: { type: String, required: true }, // e.g., "CERTIFICATE_ISSUED"
    description: { type: String, required: true }, // e.g., "Issued to John Doe"
    adminName: { type: String, required: true }, // Who did it?
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now }
});

const SystemLog = mongoose.model('SystemLog', systemLogSchema);
module.exports = SystemLog;