// server/scripts/addTestStudent.js
// Run this to quickly add a test student to the roster
require('dotenv').config();
const mongoose = require('mongoose');
const StudentRoster = require('../models/studentRoster.model');

const testStudent = {
    name: 'Test Student',
    email: 'test.student@college.com',
    usn: '1KS24MC999',
    department: 'MCA',
    semester: '1st',
    year: 2024
};

async function addTestStudent() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Check if student already exists
        const existing = await StudentRoster.findOne({ 
            $or: [
                { email: testStudent.email.toLowerCase() },
                { usn: testStudent.usn.toUpperCase() }
            ]
        });

        if (existing) {
            console.log('⚠️  Student already exists in roster!');
            console.log('Existing data:', existing);
            await mongoose.disconnect();
            return;
        }

        // Add student to roster
        const newStudent = new StudentRoster({
            name: testStudent.name,
            email: testStudent.email.toLowerCase(),
            usn: testStudent.usn.toUpperCase(),
            department: testStudent.department.toUpperCase(),
            semester: testStudent.semester,
            year: testStudent.year
        });

        await newStudent.save();

        console.log('✅ Test student added to roster!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 Use these credentials to test:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`   USN:   ${testStudent.usn}`);
        console.log(`   Email: ${testStudent.email}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Error:', error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
}

addTestStudent();