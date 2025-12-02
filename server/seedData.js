// In server/seedData.js
const mongoose = require('mongoose');
const User = require('./models/user.model');
const Event = require('./models/event.model');
const Certificate = require('./models/certificate.model');
require('dotenv').config();
const SystemLog = require('./models/systemLog.model'); // <-- IMPORT

const departments = ['CSE', 'ECE', 'MCA', 'ISE', 'MECH', 'CIVIL'];
const eventTypes = ['Workshop', 'Seminar', 'Hackathon', 'Bootcamp', 'Symposium'];

// Helper to get random item
const random = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Helper to generate a date in the past (for trends)
const getRandomDate = (start, end) => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const seedDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("🌱 Connected to MongoDB...");

        // 1. Create Dummy Students
        console.log("Creating 50 Dummy Students...");
        const students = [];
        for (let i = 1; i <= 50; i++) {
            const dept = random(departments);
            // Check if exists to avoid duplicates on re-runs
            let student = await User.findOne({ email: `student${i}@test.com` });
            
            if (!student) {
                student = await User.create({
                    name: `Test Student ${i}`,
                    email: `student${i}@test.com`,
                    password: 'password123', // Dummy password
                    role: 'Student',
                    department: dept,
                    usn: `1KS24${dept}${String(i).padStart(3, '0')}`,
                    isVerified: true
                });
            }
            students.push(student);
        }

        // 2. Create Dummy Events (Spread over last 12 months)
        console.log("Creating 12 Past Events...");
        const events = [];
        const today = new Date();
        const lastYear = new Date(new Date().setFullYear(today.getFullYear() - 1));

        for (let i = 1; i <= 12; i++) {
            const eventDate = getRandomDate(lastYear, today);
            const type = random(eventTypes);
            
            let event = await Event.findOne({ name: `Test ${type} ${i}` });
            if (!event) {
                event = await Event.create({
                    name: `Test ${type} ${i}`,
                    date: eventDate,
                    description: `A dummy description for test event ${i}`,
                    createdBy: students[0]._id, // Just assign to first user for safety (or admin id if you have it)
                    certificateConfig: {
                        collegeName: "K. S. Institute of Technology",
                        headerDepartment: `Dept of ${random(departments)}`,
                        certificateTitle: "CERTIFICATE OF ACHIEVEMENT"
                    },
                    certificatesIssued: true
                });
            }
            events.push(event);
        }

        // 3. Issue Certificates (The Data for Graphs)
        console.log("Issuing ~150 Certificates...");
        // We explicitly set 'createdAt' to match the event date so the Trend Chart works
        
        for (const event of events) {
            // Pick 10-15 random students for each event
            const attendeeCount = Math.floor(Math.random() * 6) + 10; 
            
            for (let k = 0; k < attendeeCount; k++) {
                const student = random(students);
                const certId = `CERT-TEST-${Math.floor(Math.random() * 1000000)}`;
                
                // Check duplicate
                const exists = await Certificate.findOne({ certificateId: certId });
                if (exists) continue;

                const cert = new Certificate({
                    certificateId: certId,
                    tokenId: Math.floor(Math.random() * 1000), // Fake ID
                    certificateHash: "0x" + Math.floor(Math.random()*1e16).toString(16), // Fake hash
                    transactionHash: "0x" + Math.floor(Math.random()*1e16).toString(16), // Fake tx
                    studentName: student.name,
                    studentEmail: student.email,
                    eventName: event.name,
                    eventDate: event.date,
                    issuedBy: students[0]._id, // Dummy ID
                    verificationUrl: `/verify/${certId}`
                });

                // MAGIC: Overwrite the timestamp so it shows up in past months on the chart
                cert.createdAt = event.date; 
                
                await cert.save();
            }
        }

        // ... inside seedDatabase function ...

    // 4. Create Dummy Logs (So the dashboard isn't empty)
    console.log("Creating Activity Logs...");
    await SystemLog.deleteMany({}); // Clear old logs

    const actions = [
        { action: "CERTIFICATE_ISSUED", desc: "Issued NFT to Test Student 1 for Workshop" },
        { action: "EVENT_CREATED", desc: "Created new event: AI Bootcamp" },
        { action: "CERTIFICATE_REVOKED", desc: "Revoked certificate ID: CERT-12345" },
        { action: "BULK_ISSUE", desc: "Issued 15 NFTs for event: Hackathon 2025" }
    ];

    for (let i = 0; i < 10; i++) {
        const randomAction = random(actions);
        // Create logs with random times in the last 24 hours
        const logTime = new Date(Date.now() - Math.floor(Math.random() * 86400000));

        await SystemLog.create({
            action: randomAction.action,
            description: randomAction.desc,
            adminName: "Super Admin",
            adminId: students[0]._id, // Dummy ID
            timestamp: logTime
        });
    }
    // ...

        console.log("✅ Database Seeded Successfully!");
        console.log("   - Students: 50");
        console.log("   - Events: 12");
        console.log("   - Certificates: ~150");
        console.log("👉 Go check your Analytics Dashboard!");

    } catch (error) {
        console.error("Seeding Error:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected.");
    }
};

seedDatabase();