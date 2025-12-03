// In server/seedData.js
const mongoose = require('mongoose');
const User = require('./models/user.model');
const Event = require('./models/event.model');
const Certificate = require('./models/certificate.model');
const SystemLog = require('./models/systemLog.model');
const Quiz = require('./models/quiz.model');
const StudentRoster = require('./models/studentRoster.model');
const { nanoid } = require('nanoid');
require('dotenv').config();

const seedDatabase = async () => {
    try {
        console.log("🌱 Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected.");

        // --- 0. CLEANUP (Active) ---
        console.log("🧹 Cleaning old data...");
        
        // Delete dummy students (keep faculty/admin if needed, or delete all)
        // To be safe, let's delete only users with role 'Student' created by this script
        // But for a full revert, we often want to clear everything except maybe the main admin.
        // Adjust the filter as per your need. Below deletes ALL students.
        await User.deleteMany({ role: 'Student' }); 
        
        // Delete all other seeded collections
        await Event.deleteMany({});
        await Certificate.deleteMany({});
        await SystemLog.deleteMany({});
        await Quiz.deleteMany({});
        await StudentRoster.deleteMany({});
        
        console.log("✨ Database cleanup complete. All seeded data removed.");

    } catch (error) {
        console.error("❌ Cleanup Error:", error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

seedDatabase();