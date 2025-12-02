// In server/utils/logger.js
const SystemLog = require('../models/systemLog.model');

exports.logActivity = async (adminUser, action, description) => {
    try {
        await SystemLog.create({
            action,
            description,
            adminName: adminUser.name,
            adminId: adminUser._id
        });
    } catch (e) {
        console.error("Logging failed:", e); // Don't crash the app if logging fails
    }
};