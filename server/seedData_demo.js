// In server/seedData_demo.js
const mongoose = require('mongoose');
const User = require('./models/user.model');
const Event = require('../models/event.model');
const Certificate = require('../models/certificate.model');
const SystemLog = require('../models/systemLog.model');
const Quiz = require('../models/quiz.model');
const { nanoid } = require('nanoid');
require('dotenv').config();

// --- CONFIGURATION ---
const DEPARTMENTS = ['MCA', 'CSE', 'ECE', 'ISE'];
const FUTURE_DATE = new Date(new Date().setMonth(new Date().getMonth() + 1));
const PAST_DATE = new Date(new Date().setMonth(new Date().getMonth() - 2));

// --- HELPERS ---
const random = (arr) => arr[Math.floor(Math.random() * arr.length)];
const createHash = (data) => "0x" + crypto.createHash('sha256').update(data).digest('hex').substring(0, 40);

const seedDatabase = async () => {
    try {
        console.log("🌱 Connecting to MongoDB for DEMO DATA...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected.");

        // --- 1. IDENTIFY ACTORS (Assuming Admin/Faculty exist) ---
        let admin = await User.findOne({ role: 'SuperAdmin' });
        let faculty = await User.findOne({ email: 'faculty@college.com' });
        
        if (!admin) {
            admin = await User.create({ name: "Demo Admin", email: "admin@demo.com", password: "$2a$10$abcdefghijklmnopqrstuvwxyz", role: "SuperAdmin", department: "College", isVerified: true });
        }
        if (!faculty) {
             faculty = await User.create({ name: "Prof. Demo", email: "prof@demo.com", password: "$2a$10$abcdefghijklmnopqrstuvwxyz", role: "Faculty", department: "CSE", isVerified: true });
        }
        const creatorId = admin._id;

        // --- 2. CREATE PRIMARY DEMO STUDENT ---
        const demoEmail = 'student.demo@college.com';
        let demoStudent = await User.findOne({ email: demoEmail });
        
        if (!demoStudent) {
            demoStudent = await User.create({
                name: "Shravan Arimalla (DEMO)",
                email: demoEmail,
                password: "$2a$10$abcdefghijklmnopqrstuvwxyz", // Password is still 'password123'
                role: "Student",
                department: "MCA",
                usn: "1KS24MC005",
                semester: "3rd",
                isVerified: true,
                walletAddress: "0x43005A12Fee6EA130c754852ee11555b0875B110" // The user's provided wallet
            });
            console.log(`✨ Created Demo Student: ${demoStudent.name}`);
        } else {
             // Ensure existing student has correct wallet/role for SIWE
             demoStudent.role = 'Student';
             demoStudent.walletAddress = "0x43005A12Fee6EA130c754852ee11555b0875B110";
             await demoStudent.save();
             console.log(`✨ Updated existing Demo Student: ${demoStudent.name}`);
        }

        // --- 3. CREATE CORE CURRICULUM QUIZZES ---
        console.log("🧠 Seeding Core Quizzes...");
        const quizTopics = [
            "HTML & CSS Basics", 
            "JavaScript Fundamentals", 
            "Data Analysis with Pandas", 
            "Smart Contracts with Solidity"
        ];
        
        for (const topic of quizTopics) {
            await Quiz.findOneAndUpdate(
                { topic: topic },
                { $setOnInsert: { // Only insert if not found
                    description: `Core skill assessment in ${topic}.`,
                    totalQuestions: 10, passingScore: 70, createdBy: creatorId, department: random(DEPARTMENTS), isActive: true
                }},
                { upsert: true, new: true } // Upsert: Insert if not found
            );
            
            // Create Shadow Event
            await Event.findOneAndUpdate(
                { name: `Certified: ${topic}` },
                { $setOnInsert: {
                    date: new Date(), description: `Skill Credential for ${topic}`,
                    createdBy: creatorId, department: random(DEPARTMENTS), certificatesIssued: true,
                    certificateConfig: { headerDepartment: `DEPARTMENT OF ${random(DEPARTMENTS)}`, certificateTitle: "CERTIFICATE OF SKILL" }
                }},
                { upsert: true }
            );
        }

        // --- 4. CREATE PAST EVENT & CERTIFICATE (For the Demo Student) ---
        console.log("📜 Issuing specific certificates for Shravan...");

        // Event: Past Certification (For Analytics)
        let pastEvent = await Event.findOneAndUpdate(
            { name: "Past Workshop Leadership" },
            { $setOnInsert: {
                date: PAST_DATE, createdBy: creatorId, department: "MCA", certificatesIssued: true,
                certificateConfig: { headerDepartment: "DEPARTMENT OF MCA", certificateTitle: "CERTIFICATE OF ACHIEVEMENT" }
            }},
            { upsert: true, new: true }
        );

        // Certificate 1: A Past Achievement (Increases skill level)
        await Certificate.findOneAndUpdate(
            { studentEmail: demoEmail, eventName: pastEvent.name },
            { $setOnInsert: {
                certificateId: `CERT-PAST-${nanoid(6)}`, 
                tokenId: '101', 
                transactionHash: createHash('past1'),
                studentName: demoStudent.name, studentEmail: demoEmail, eventDate: PAST_DATE,
                issuedBy: creatorId, verificationUrl: `/verify/CERT-PAST-${nanoid(6)}`
            }},
            { upsert: true }
        );

        // --- 5. CREATE FUTURE EVENT (For Recommendations) ---
        await Event.findOneAndUpdate(
            { name: "Full-Stack Job Readiness Workshop" },
            { $setOnInsert: {
                date: FUTURE_DATE, description: "Focus on Next.js, TypeScript, and Docker.",
                createdBy: creatorId, department: "MCA", isPublic: true, certificatesIssued: false,
                certificateConfig: { headerDepartment: "DEPARTMENT OF MCA", eventType: "Workshop" }
            }},
            { upsert: true }
        );


        // --- 6. CREATE LOGS (Cleanly) ---
        console.log("📝 Seeding Logs...");
        await SystemLog.deleteMany({}); // Clear old logs
        await SystemLog.create({ action: "USER_ACTIVATED", description: `Student ${demoStudent.name} successfully activated account.`, adminName: "System", adminId: creatorId });
        await SystemLog.create({ action: "CERTIFICATE_ISSUED", description: `Issued NFT for ${pastEvent.name} to ${demoStudent.name}.`, adminName: "System", adminId: creatorId });


        console.log(`\n✅ DEMO DATA SEEDED SUCCESSFULLY!`);
        console.log(`   - Login Email: ${demoEmail}`);
        console.log(`   - Password: password123`);
        console.log(`   - Wallet Address: ${demoStudent.walletAddress}`);
        console.log(`\n👉 Run 'node index.js' and log in as the demo student.`);

    } catch (error) {
        console.error("❌ Seeding Error:", error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

seedDatabase();