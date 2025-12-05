// In server/controllers/poap.controller.js
const poapService = require('../services/poap.service');
const POAP = require('../models/poap.model');
const Event = require('../models/event.model');
const User = require('../models/user.model');
const QRCode = require('qrcode');
const crypto = require('crypto');
const { getAddress } = require('ethers/address'); // <--- CRITICAL FIX: Ensure this import is here

// ... (rest of the controller functions)

// --- 2. CLAIM POAP (Student) ---
exports.claimPOAP = async (req, res) => {
    try {
        const { token, eventId, gps } = req.body;
        const studentId = req.user.id;

        // 1. Validate event and token
        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        if (event.checkInToken !== token) return res.status(400).json({ message: 'Invalid or expired QR code' });
        
        const student = await User.findById(studentId);
        if (!student.walletAddress) return res.status(400).json({ message: 'Please connect your wallet first to receive POAP' });

        // --- FIX: NORMALIZE WALLET ADDRESS ---
        const studentWallet = getAddress(student.walletAddress); 
        // ------------------------------------

        // 3. Validate GPS location (Bypassed distance check for demo)
        if (!gps || !gps.latitude) {
            return res.status(400).json({ message: 'Location data is required for POAP claim.' });
        }
        
        // 4. Generate event hash
        const eventHash = poapService.generateEventHash(event._id, event.name, event.date);
        
        // 5. Check if already claimed
        if (await POAP.findOne({ studentWallet: studentWallet.toLowerCase(), eventHash: eventHash })) {
            return res.status(400).json({ message: 'You have already claimed POAP for this event.' });
        }
        
        // 6. Mint POAP on blockchain
        const mintResult = await poapService.mintPOAP(
            studentWallet,
            { eventId: event._id, eventName: event.name, eventDate: event.date },
            gps
        );
        
        // 7. Save to database
        await POAP.create({
            tokenId: mintResult.tokenId,
            transactionHash: mintResult.transactionHash,
            eventHash: eventHash,
            eventId: event._id,
            eventName: event.name,
            eventDate: event.date,
            studentWallet: studentWallet.toLowerCase(),
            studentEmail: student.email,
            studentName: student.name,
            checkInLocation: gps,
            issuer: req.user.id
        });
        
        // 8. Add participation to event
        event.participants.push({ name: student.name, email: student.email });
        await event.save();
        
        res.status(201).json({ success: true, message: 'POAP claimed successfully!' });
        
    } catch (error) {
        console.error('POAP Claim Error:', error);
        res.status(500).json({ message: 'POAP claim failed: ' + error.message });
    }
};

// --- REST OF THE CONTROLLER FUNCTIONS (getEventAttendance, getMyPOAPs, etc.) ---
// ... (The rest of the controller functions are assumed to be appended here) ...

// --- 3. GET MY POAPS (Student) ---
exports.getMyPOAPs = async (req, res) => {
    try {
        const student = await User.findById(req.user.id);
        
        const poaps = await POAP.find({
            studentEmail: student.email
        })
        .populate('eventId', 'name date description')
        .sort({ checkInTime: -1 });
        
        res.json(poaps);
        
    } catch (error) {
        console.error('POAP Fetch Error:', error);
        res.status(500).json({ message: 'Failed to fetch POAPs' });
    }
};

// --- 4. VERIFY POAP (Public) ---
exports.verifyPOAP = async (req, res) => {
    try {
        const { tokenId } = req.params;
        
        // Get from database
        const poap = await POAP.findOne({ tokenId })
            .populate('eventId', 'name date')
            .populate('issuer', 'name');
        
        if (!poap) {
            return res.status(404).json({ message: 'POAP not found' });
        }
        
        const blockchainRecord = await poapService.validateAttendance(tokenId);
        
        res.json({
            verified: true,
            poap: {
                tokenId: poap.tokenId,
                eventName: poap.eventName,
                studentName: poap.studentName,
                checkInTime: poap.checkInTime,
                isValid: !poap.isRevoked && blockchainRecord?.isValid,
                transactionHash: poap.transactionHash
            },
            blockchain: blockchainRecord
        });
        
    } catch (error) {
        console.error('POAP Verification Error:', error);
        res.status(500).json({ message: 'Verification failed' });
    }
};

// --- 5. GET ATTENDANCE REPORT (Faculty) ---
exports.getEventAttendance = async (req, res) => {
    try {
        const { eventId } = req.params;
        
        const attendees = await POAP.find({ eventId })
            .select('studentName studentEmail checkInTime attendanceScore')
            .sort({ checkInTime: 1 });
        
        const stats = {
            totalAttendees: attendees.length,
            onTime: attendees.filter(a => a.attendanceScore === 100).length,
            late: attendees.filter(a => a.attendanceScore < 100).length
        };
        
        res.json({ stats, attendees });
        
    } catch (error) {
        res.status(500).json({ message: 'Report generation failed' });
    }
};

// --- 6. REVOKE POAP (Admin) ---
exports.revokePOAP = async (req, res) => {
    try {
        const { tokenId, reason } = req.body;
        
        const txHash = await poapService.revokePOAP(tokenId, reason);
        
        await POAP.findOneAndUpdate(
            { tokenId },
            { 
                isRevoked: true, 
                revokedAt: new Date(),
                revokeReason: reason
            }
        );
        
        res.json({ 
            message: 'POAP revoked successfully',
            transactionHash: txHash
        });
        
    } catch (error) {
        res.status(500).json({ message: 'Revocation failed' });
    }
};