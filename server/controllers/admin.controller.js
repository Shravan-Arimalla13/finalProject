// server/controllers/admin.controller.js - WITH BYPASS MODE
const User = require('../models/user.model');
const StudentRoster = require('../models/studentRoster.model');
const jwt = require('jsonwebtoken');
const { sendFacultyInvite } = require('../utils/mailer');
const csv = require('csv-parser');
const stream = require('stream');
const Event = require('../models/event.model');
const Certificate = require('../models/certificate.model');
const SystemLog = require('../models/systemLog.model');

// --- CONFIG: SET TO TRUE TO BYPASS EMAILS ---
const BYPASS_EMAIL = process.env.BYPASS_EMAIL === 'true';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://the-blockchain-based-skill-credenti.vercel.app';
// --------------------------------------------

exports.inviteFaculty = async (req, res) => {
    const { name, email, department } = req.body;

    try {
        // 1. Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'A user with this email already exists.' });
        }

        // 2. Create the invite token
        const inviteToken = jwt.sign(
            { name, email: email.toLowerCase(), department, role: 'Faculty' },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // --- BYPASS EMAIL LOGIC ---
        if (BYPASS_EMAIL) {
            const inviteLink = `${FRONTEND_URL}/claim-invite/${inviteToken}`;
            
            console.log('🔓 EMAIL BYPASS MODE - Faculty Invite Link:', inviteLink);
            console.log('📧 Invite for:', { name, email, department });
            
            return res.status(200).json({ 
                message: '⚠️ Email sending is disabled. Share the invite link manually.',
                inviteLink: inviteLink,
                bypassMode: true,
                faculty: { name, email, department }
            });
        }
        // --------------------------

        // 3. Normal email flow
        try {
            await sendFacultyInvite(email, inviteToken);
            res.status(200).json({ message: `Invite sent successfully to ${email}.` });
        } catch (emailError) {
            console.error("EMAIL FAILED:", emailError.message);
            
            // Provide fallback link
            const inviteLink = `${FRONTEND_URL}/claim-invite/${inviteToken}`;
            
            return res.status(200).json({ 
                message: 'Email delivery failed. Use this link instead:',
                inviteLink: inviteLink,
                emailFailed: true,
                faculty: { name, email, department }
            });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// --- ROSTER IMPORT (Unchanged) ---
exports.importStudentRoster = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    const results = [];
    let successCount = 0;
    let skippedCount = 0;
    const errors = [];

    const bufferStream = new stream.PassThrough();
    bufferStream.end(req.file.buffer);

    bufferStream
        .pipe(csv({ 
            mapHeaders: ({ header }) => header.trim().toLowerCase() 
        }))
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            for (const [index, row] of results.entries()) {
                const { name, email, usn, department, year, semester } = row;

                if (!name || !email || !usn || !department || !year || !semester) {
                    errors.push(`Row ${index + 2}: Missing required fields (name, email, usn, department, year, semester).`);
                    skippedCount++;
                    continue;
                }

                try {
                    const emailLower = email.toLowerCase();
                    const usnLower = usn.toLowerCase();

                    const existingUser = await User.findOne({ $or: [{ email: emailLower }, { usn: usnLower }] });
                    const existingRoster = await StudentRoster.findOne({ $or: [{ email: emailLower }, { usn: usnLower }] });

                    if (existingUser || existingRoster) {
                        skippedCount++;
                        continue; 
                    }

                    const newRosterEntry = new StudentRoster({
                        name,
                        email: emailLower,
                        usn: usn.toUpperCase(),
                        department: department.toUpperCase(),
                        year: parseInt(year),
                        semester
                    });
                    await newRosterEntry.save();
                    successCount++;

                } catch (error) {
                    errors.push(`Row ${index + 2} (Email: ${email}): ${error.message}`);
                    skippedCount++;
                }
            }

            res.status(200).json({
                message: `Roster import complete. Added ${successCount} new students. Skipped ${skippedCount} duplicates or invalid rows.`,
                errors: errors
            });
        })
        .on('error', (error) => {
            res.status(500).json({ message: 'Error parsing CSV file', errors: [error.message] });
        });
};

// --- ANALYTICS (Unchanged) ---
exports.getAnalytics = async (req, res) => {
    try {
        const totalStudents = await User.countDocuments({ role: 'Student' });
        const totalEvents = await Event.countDocuments();
        const totalCerts = await Certificate.countDocuments();

        const verifiedCertsCount = await Certificate.countDocuments({ scanCount: { $gt: 0 } });
        const verificationRate = totalCerts > 0 
            ? ((verifiedCertsCount / totalCerts) * 100).toFixed(1) 
            : 0;

        const certsByDept = await Certificate.aggregate([
            {
                $lookup: { from: 'users', localField: 'studentEmail', foreignField: 'email', as: 'student' }
            },
            { $unwind: '$student' },
            { $group: { _id: '$student.department', count: { $sum: 1 } } },
            { $project: { name: '$_id', value: '$count', _id: 0 } }
        ]);

        const monthlyData = await Certificate.aggregate([
            { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const trends = monthlyData.map(item => ({ name: monthNames[item._id - 1], total: item.count }));

        const studentsByDept = await User.aggregate([
            { $match: { role: 'Student' } },
            { $group: { _id: '$department', count: { $sum: 1 } } },
            { $project: { name: '$_id', count: 1, _id: 0 } },
            { $sort: { count: -1 } }
        ]);

        const recentLogs = await SystemLog.find().sort({ timestamp: -1 }).limit(10);

        const detailedReports = await Certificate.find()
            .sort({ createdAt: -1 })
            .limit(50);

        const blockchainLogs = detailedReports.map(cert => ({
            txHash: cert.transactionHash || 'Pending...',
            method: 'MintCertificate', 
            timestamp: cert.createdAt,
            status: cert.transactionHash ? 'Success' : 'Failed'
        }));

        res.status(200).json({
            totalStudents, 
            totalEvents, 
            totalCerts,
            verificationRate,
            certsByDept, 
            studentsByDept, 
            trends, 
            recentLogs,
            detailedReports, 
            blockchainLogs   
        });

    } catch (error) {
        console.error('Analytics Error:', error);
        res.status(500).json({ message: 'Server Error getting analytics' });
    }
};