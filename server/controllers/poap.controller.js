// server/controllers/poap.controller.js - ENHANCED VERSION
const poapService = require('../services/poap.service');
const POAP = require('../models/poap.model');
const Event = require('../models/event.model');
const User = require('../models/user.model');
const QRCode = require('qrcode');
const crypto = require('crypto');
const { getAddress } = require('ethers/address');
const { getCurrentIST, formatISTDisplay } = require('../utils/timezone');

// ============================================
// 1. GENERATE QR CODE (ENHANCED: 10-MIN VALIDITY + LIVE CHECK)
// ============================================
exports.generateEventQR = async (req, res) => {
    try {
        const { eventId } = req.params;
        const event = await Event.findById(eventId);
        
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        
        // NEW: Check if event is currently live
        const liveCheck = poapService.validateEventIsLive(event.date, event.startTime, event.endTime);
        
        if (!liveCheck.isLive) {
            return res.status(400).json({
                message: liveCheck.message,
                status: liveCheck.status,
                currentIST: liveCheck.currentIST,
                eventStart: event.startTime,
                eventEnd: event.endTime
            });
        }
        
        const now = getCurrentIST();
        const checkInToken = crypto.randomBytes(32).toString('hex');
        
        // NEW: Store QR generation time and 10-minute expiry
        event.checkInToken = checkInToken;
        event.qrGeneratedAt = now; // NEW FIELD
        event.qrExpiresAt = new Date(now.getTime() + 10 * 60 * 1000); // NEW FIELD
        await event.save();
        
        const baseUrl = process.env.FRONTEND_URL || "https://final-project-wheat-mu-84.vercel.app";
        const checkInUrl = `${baseUrl}/poap-checkin?token=${checkInToken}&eventId=${eventId}`;
        
        const qrCode = await QRCode.toDataURL(checkInUrl, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            width: 400,
            margin: 2,
            color: { dark: '#000000', light: '#FFFFFF' }
        });
        
        console.log(`✅ QR Generated for "${event.name}" - Valid for 10 minutes`);
        
        res.json({ 
            qrCode: qrCode, 
            checkInUrl: checkInUrl,
            generatedAt: now.toISOString(),
            expiresAt: event.qrExpiresAt.toISOString(),
            validityMinutes: 10,
            eventStatus: 'Ongoing'
        });
        
    } catch (error) {
        console.error('QR Generation Error:', error);
        res.status(500).json({ message: 'QR generation failed: ' + error.message });
    }
};

// ============================================
// 2. CLAIM POAP (ENHANCED: QR VALIDATION + SCORING)
// ============================================
exports.claimPOAP = async (req, res) => {
    try {
        const { token, eventId, gps } = req.body;
        const studentId = req.user.id;

        if (!token || !eventId || !gps) {
            return res.status(400).json({ 
                message: 'Missing required fields: token, eventId, gps' 
            });
        }

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        if (event.checkInToken !== token) {
            return res.status(400).json({ 
                message: 'Invalid or expired QR code.' 
            });
        }

        // NEW: Validate QR expiry (10 minutes)
        if (!event.qrGeneratedAt) {
            return res.status(400).json({
                message: 'QR code metadata missing. Please regenerate QR.'
            });
        }

        const qrValidation = poapService.validateQRToken(event.qrGeneratedAt, token);
        
        if (!qrValidation.isValid) {
            return res.status(400).json({
                message: qrValidation.message,
                expired: true,
                instruction: 'Ask your faculty to generate a fresh QR code'
            });
        }
        
        console.log(`⏱️ QR Valid - ${qrValidation.remainingSeconds}s remaining`);
        
        const student = await User.findById(studentId);
        if (!student || !student.walletAddress) {
            return res.status(400).json({ message: 'Wallet not connected' });
        }

        const studentWallet = getAddress(student.walletAddress.toLowerCase());
        
        // NEW: Calculate score based on QR generation time
        const checkInTime = getCurrentIST();
        const attendanceScore = poapService.calculateAttendanceScore(
            event.qrGeneratedAt,
            checkInTime
        );
        
        // Mint POAP
        const mintResult = await poapService.mintPOAP(
            studentWallet,
            { eventId: event._id, eventName: event.name, eventDate: event.date },
            gps,
            event.location
        );
        
        const eventHash = poapService.generateEventHash(event._id, event.name, event.date);

        const newPOAP = await POAP.create({
            tokenId: mintResult.tokenId,
            transactionHash: mintResult.transactionHash,
            eventHash: eventHash,
            eventId: event._id,
            eventName: event.name,
            eventDate: event.date,
            studentWallet: studentWallet.toLowerCase(),
            studentEmail: student.email,
            studentName: student.name,
            checkInLocation: {
                latitude: gps.latitude,
                longitude: gps.longitude,
                accuracy: gps.accuracy || null
            },
            attendanceScore: attendanceScore,
            issuer: req.user.id
        });
        
        res.status(201).json({ 
            success: true, 
            message: 'POAP claimed successfully!',
            attendanceScore: attendanceScore,
            scoreMessage: attendanceScore === 100 
                ? '🎉 Perfect timing! On-time attendance.' 
                : `⏰ Score: ${attendanceScore}% (checked in late)`,
            poap: newPOAP
        });
        
    } catch (error) {
        console.error('POAP Claim Error:', error);
        res.status(500).json({ message: 'POAP claim failed: ' + error.message });
    }
};

// ============================================
// 3. GET MY POAPs (Student View)
// ============================================
exports.getMyPOAPs = async (req, res) => {
    try {
        const student = await User.findById(req.user.id);
        if (!student) return res.status(404).json({ message: 'User not found' });
        
        const poaps = await POAP.find({ studentEmail: student.email })
            .populate('eventId', 'name date description location')
            .sort({ checkInTime: -1 });
        
        res.json(poaps);
    } catch (error) {
        console.error('POAP Fetch Error:', error);
        res.status(500).json({ message: 'Failed to fetch POAPs' });
    }
};

// ============================================
// 4. VERIFY POAP (Public)
// ============================================
exports.verifyPOAP = async (req, res) => {
    try {
        const { tokenId } = req.params;
        
        const poap = await POAP.findOne({ tokenId })
            .populate('eventId', 'name date description')
            .populate('issuer', 'name');
        
        if (!poap) {
            return res.status(404).json({ 
                verified: false,
                message: 'POAP not found' 
            });
        }
        
        const isValid = await poapService.isAttendanceValid(tokenId);
        
        res.json({ 
            verified: true, 
            isValid: isValid && !poap.isRevoked,
            poap: {
                tokenId: poap.tokenId,
                eventName: poap.eventName,
                studentName: poap.studentName,
                checkInTime: poap.checkInTime,
                attendanceScore: poap.attendanceScore,
                transactionHash: poap.transactionHash,
                isRevoked: poap.isRevoked
            }
        });
    } catch (error) {
        console.error('POAP Verification Error:', error);
        res.status(500).json({ verified: false, message: 'Verification failed' });
    }
};

// ============================================
// 5. GET EVENT ATTENDANCE REPORT (Faculty)
// ============================================
exports.getEventAttendance = async (req, res) => {
    try {
        const { eventId } = req.params;
        
        const attendees = await POAP.find({ eventId })
            .select('studentName studentEmail checkInTime attendanceScore checkInLocation')
            .sort({ checkInTime: 1 });
        
        const stats = {
            totalAttendees: attendees.length,
            perfect: attendees.filter(a => a.attendanceScore === 100).length,
            late: attendees.filter(a => a.attendanceScore < 100).length,
            averageScore: attendees.length > 0
                ? Math.round(attendees.reduce((sum, a) => sum + a.attendanceScore, 0) / attendees.length)
                : 0
        };
        
        res.json({ stats, attendees });
    } catch (error) {
        console.error('Attendance Report Error:', error);
        res.status(500).json({ message: 'Report generation failed' });
    }
};

// ============================================
// 6. REVOKE POAP (Admin)
// ============================================
exports.revokePOAP = async (req, res) => {
    try {
        const { tokenId, reason } = req.body;
        if (!tokenId) return res.status(400).json({ message: 'Token ID required' });
        
        const txHash = await poapService.revokePOAP(tokenId, reason || 'Admin revocation');
        
        await POAP.findOneAndUpdate(
            { tokenId },
            { 
                isRevoked: true, 
                revokedAt: getCurrentIST(), 
                revokeReason: reason || 'Admin revocation'
            }
        );
        
        res.json({ message: 'POAP revoked successfully', transactionHash: txHash });
    } catch (error) {
        console.error('POAP Revocation Error:', error);
        res.status(500).json({ message: 'Revocation failed: ' + error.message });
    }
};

module.exports = exports;