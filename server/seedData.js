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

const DEPARTMENTS = ['MCA', 'CSE', 'ECE', 'ISE', 'MECH', 'CIVIL'];

// --- 1. STRUCTURED CURRICULUM FOR RECOMMENDATION TESTING ---
const CURRICULUM = [
    // Path: Full-Stack Developer
    { topic: "HTML & CSS Basics", category: "Web Development", level: "Beginner" },
    { topic: "JavaScript Fundamentals", category: "Web Development", level: "Beginner" },
    { topic: "React.js Hooks", category: "Web Development", level: "Intermediate" },
    { topic: "Node.js Backend Architecture", category: "Web Development", level: "Advanced" },
    
    // Path: Data Scientist
    { topic: "Python for Beginners", category: "Data Science", level: "Beginner" },
    { topic: "Data Analysis with Pandas", category: "Data Science", level: "Intermediate" },
    { topic: "Machine Learning Algorithms", category: "Data Science", level: "Advanced" },
    
    // Path: Blockchain Developer
    { topic: "Blockchain Fundamentals", category: "Blockchain", level: "Beginner" },
    { topic: "Smart Contracts with Solidity", category: "Blockchain", level: "Intermediate" },
    { topic: "Web3 Security", category: "Blockchain", level: "Advanced" }
];

// --- 2. UPCOMING EVENTS (Recommendations) ---
const FUTURE_EVENTS = [
    { name: "Full-Stack Bootcamp 2025", desc: "Master React and Node.js in this intensive workshop.", topic: "Web Development" },
    { name: "AI & Data Science Summit", desc: "Learn the future of AI with Python and TensorFlow.", topic: "Data Science" },
    { name: "Ethereum Developer Conference", desc: "Build decentralized apps on Web3.", topic: "Blockchain" },
    { name: "Advanced React Workshop", desc: "Deep dive into performance and state management.", topic: "React" }
];

const random = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

const seedDatabase = async () => {
    try {
        console.log("🌱 Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected.");

        // --- OPTIONAL: CLEANUP ---
        // Uncomment to start fresh (Recommended for testing recommendations)
        // await Quiz.deleteMany({});
        // await Event.deleteMany({});
        // console.log("🧹 Cleaned old Quizzes and Events.");

        // 1. Find Creator (Faculty/Admin)
        let creator = await User.findOne({ role: { $in: ['Faculty', 'SuperAdmin'] } });
        if (!creator) {
            console.log("⚠️ No Faculty/Admin found. Creating dummy admin...");
            creator = await User.create({
                name: "System Admin",
                email: "admin@seed.com",
                password: "password123",
                role: "SuperAdmin",
                department: "MCA",
                isVerified: true
            });
        }

        // 2. Seed Quizzes (The Learning Path)
        console.log("🧠 Seeding Curriculum Quizzes...");
        for (const item of CURRICULUM) {
            const existing = await Quiz.findOne({ topic: item.topic });
            if (!existing) {
                await Quiz.create({
                    topic: item.topic,
                    description: `Test your skills in ${item.topic}. Level: ${item.level}`,
                    totalQuestions: 5, // Short for testing
                    passingScore: 60,
                    createdBy: creator._id,
                    department: "MCA", // Default to MCA so you can see them
                    isActive: true
                });
                console.log(`   -> Created Quiz: ${item.topic}`);
            }
        }

        // 3. Seed Future Events (The Recommendations)
        console.log("📅 Seeding Future Events...");
        const nextMonth = new Date();
        nextMonth.setDate(nextMonth.getDate() + 30);
        
        for (const item of FUTURE_EVENTS) {
            const existing = await Event.findOne({ name: item.name });
            if (!existing) {
                await Event.create({
                    name: item.name,
                    date: nextMonth, // Future date
                    description: item.desc,
                    createdBy: creator._id,
                    department: "MCA",
                    isPublic: true,
                    certificatesIssued: false,
                    certificateConfig: {
                        collegeName: "K. S. Institute of Technology",
                        headerDepartment: "DEPARTMENT OF MCA",
                        certificateTitle: "CERTIFICATE OF PARTICIPATION",
                        eventType: "Workshop"
                    }
                });
                console.log(`   -> Created Event: ${item.name}`);
            }
        }

        // 4. Seed Past Events (For Analytics Graphs)
        console.log("📊 Seeding Past Data for Analytics...");
        const today = new Date();
        const lastYear = new Date(new Date().setFullYear(today.getFullYear() - 1));
        
        for (let i = 1; i <= 10; i++) {
            const pastDate = randomDate(lastYear, today);
            await Event.create({
                name: `Past Workshop ${i}`,
                date: pastDate,
                description: "Legacy event",
                createdBy: creator._id,
                department: random(DEPARTMENTS),
                isPublic: false,
                certificatesIssued: true
            });
        }

        console.log("\n✅ SEEDING COMPLETE!");
        console.log("   You now have a structured curriculum to test the Recommendation Engine.");
        console.log("   1. Take 'HTML & CSS Basics' -> Expect 'Web Development' suggestions.");
        console.log("   2. Take 'Python for Beginners' -> Expect 'Data Science' suggestions.");

    } catch (error) {
        console.error("❌ Seeding Error:", error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

seedDatabase();