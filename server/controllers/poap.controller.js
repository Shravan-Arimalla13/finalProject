// server/controllers/poap.controller.js - COMPLETE CONTROLLER
const poapService = require('../services/poap.service');
const POAP = require('../models/poap.model');
const Event = require('../models/event.model');
const User = require('../models/user.model');
const QRCode = require('qrcode');
const crypto = require('crypto');
const { getAddress } = require('ethers/address');
const { getCurrentIST, calculateAttendanceScoreIST } = require('../utils/timezone');


// ============================================
// 1. GENERATE QR CODE FOR EVENT CHECK-IN
// ============================================

/**
 * Generate QR code and check-in link for an event
 * POST /api/poap/event/:eventId/qr
 */
// server/controllers/poap.controller.js

exports.generateEventQR = async (req, res) => {
    try {
        const { eventId } = req.params;
        const event = await Event.findById(eventId);
        
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const checkInToken = crypto.randomBytes(32).toString('hex');
        
        // DYNAMIC EXPIRY: Set token to expire exactly 10 minutes from NOW
        const expiryTime = new Date(Date.now() + 10 * 60 * 1000);
        
        event.checkInToken = checkInToken;
        event.checkInTokenExpiry = expiryTime;
        await event.save();
        
        const baseUrl = process.env.FRONTEND_URL || "https://final-project-wheat-mu-84.vercel.app";
        const checkInUrl = `${baseUrl}/poap-checkin?token=${checkInToken}&eventId=${eventId}`;
        
        const qrCode = await QRCode.toDataURL(checkInUrl, { errorCorrectionLevel: 'H' });
        
        console.log(`✅ Dynamic QR Generated for: ${event.name}`);
        console.log(`🕒 Valid until: ${expiryTime.toLocaleTimeString('en-IN')}`);
        
        res.json({ qrCode, checkInUrl, expiresAt: expiryTime });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.claimPOAP = async (req, res) => {
    try {
        const { token, eventId, gps } = req.body;
        const event = await Event.findById(eventId);
        
        // UNIFIED IST LOGGING
        const now = getCurrentIST();
        console.log(`🕒 IST Check-In Attempt: ${now.toLocaleString('en-IN')}`);
        console.log(`   > Event: ${event?.name} | Start: ${event?.startTime}`);

        // VALIDATE TOKEN EXPIRY (The 10-minute window)
        if (new Date() > event.checkInTokenExpiry) {
            return res.status(400).json({ message: "This QR code has expired (10 min limit)." });
        }

        if (event.checkInToken !== token) {
            return res.status(400).json({ message: "Invalid QR code." });
        }

        // Location Check
        const eventLocation = {
            latitude: event.location?.latitude || event.location?.coordinates?.[1],
            longitude: event.location?.longitude || event.location?.coordinates?.[0]
        };

        // Score Calculation with Grace Period
        const attendanceScore = poapService.calculateAttendanceScoreIST(event.date, event.startTime, now);

        const mintResult = await poapService.mintPOAP(req.user.walletAddress, event, gps, eventLocation);

        // ... Save POAP logic ...
        res.status(201).json({ success: true, score: attendanceScore });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ============================================
// 3. GET MY POAPs (Student View)
// ============================================

/**
 * Get all POAPs for logged-in student
 * GET /api/poap/my-poaps
 */
exports.getMyPOAPs = async (req, res) => {
    try {
        const student = await User.findById(req.user.id);
        
        if (!student) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const poaps = await POAP.find({
            studentEmail: student.email
        })
        .populate('eventId', 'name date description location')
        .sort({ checkInTime: -1 });
        
        console.log(`📋 Retrieved ${poaps.length} POAPs for ${student.email}`);
        
        res.json(poaps);
        
    } catch (error) {
        console.error('POAP Fetch Error:', error);
        res.status(500).json({ message: 'Failed to fetch POAPs' });
    }
};

// ============================================
// 4. VERIFY POAP (Public)
// ============================================

/**
 * Verify a POAP by token ID (public endpoint)
 * GET /api/poap/verify/:tokenId
 */
exports.verifyPOAP = async (req, res) => {
    try {
        const { tokenId } = req.params;
        
        // Fetch from database
        const poap = await POAP.findOne({ tokenId })
            .populate('eventId', 'name date description')
            .populate('issuer', 'name');
        
        if (!poap) {
            return res.status(404).json({ 
                verified: false,
                message: 'POAP not found' 
            });
        }
        
        // Check blockchain validity
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
        res.status(500).json({ 
            verified: false,
            message: 'Verification failed' 
        });
    }
};

// ============================================
// 5. GET EVENT ATTENDANCE REPORT (Faculty)
// ============================================

/**
 * Get attendance report for an event
 * GET /api/poap/event/:eventId/attendance
 */
exports.getEventAttendance = async (req, res) => {
    try {
        const { eventId } = req.params;
        
        // Fetch all POAPs for this event
        const attendees = await POAP.find({ eventId })
            .select('studentName studentEmail checkInTime attendanceScore checkInLocation')
            .sort({ checkInTime: 1 });
        
        // Calculate statistics
        const stats = {
            totalAttendees: attendees.length,
            onTime: attendees.filter(a => a.attendanceScore === 100).length,
            late: attendees.filter(a => a.attendanceScore < 100).length,
            averageScore: attendees.length > 0
                ? Math.round(attendees.reduce((sum, a) => sum + a.attendanceScore, 0) / attendees.length)
                : 0
        };
        
        console.log(`📊 Attendance Report Generated: ${attendees.length} attendees`);
        
        res.json({ 
            stats, 
            attendees 
        });
        
    } catch (error) {
        console.error('Attendance Report Error:', error);
        res.status(500).json({ message: 'Report generation failed' });
    }
};

// ============================================
// 6. REVOKE POAP (Admin)
// ============================================

/**
 * Revoke a POAP (for fraudulent check-ins)
 * POST /api/poap/revoke
 */
exports.revokePOAP = async (req, res) => {
    try {
        const { tokenId, reason } = req.body;
        
        if (!tokenId) {
            return res.status(400).json({ message: 'Token ID is required' });
        }
        
        // Revoke on blockchain
        const txHash = await poapService.revokePOAP(
            tokenId, 
            reason || 'Admin revocation'
        );
        
        // Update database
        await POAP.findOneAndUpdate(
            { tokenId },
            { 
                isRevoked: true, 
                revokedAt: new Date(), 
                revokeReason: reason || 'Admin revocation'
            }
        );
        
        console.log(`🚫 POAP #${tokenId} revoked`);
        
        res.json({ 
            message: 'POAP revoked successfully',
            transactionHash: txHash
        });
        
    } catch (error) {
        console.error('POAP Revocation Error:', error);
        res.status(500).json({ message: 'Revocation failed: ' + error.message });
    }
};

// ============================================
// 7. BULK REVOKE (Admin - Optional)
// ============================================

/**
 * Revoke multiple POAPs at once
 * POST /api/poap/bulk-revoke
 */
exports.bulkRevokePOAPs = async (req, res) => {
    try {
        const { tokenIds, reason } = req.body;
        
        if (!Array.isArray(tokenIds) || tokenIds.length === 0) {
            return res.status(400).json({ message: 'Token IDs array is required' });
        }
        
        const results = [];
        
        for (const tokenId of tokenIds) {
            try {
                const txHash = await poapService.revokePOAP(tokenId, reason);
                
                await POAP.findOneAndUpdate(
                    { tokenId },
                    { 
                        isRevoked: true, 
                        revokedAt: new Date(), 
                        revokeReason: reason 
                    }
                );
                
                results.push({ tokenId, success: true, txHash });
            } catch (error) {
                results.push({ tokenId, success: false, error: error.message });
            }
        }
        
        const successCount = results.filter(r => r.success).length;
        
        res.json({
            message: `Revoked ${successCount}/${tokenIds.length} POAPs`,
            results
        });
        
    } catch (error) {
        console.error('Bulk Revoke Error:', error);
        res.status(500).json({ message: 'Bulk revocation failed' });
    }
};

module.exports = exports;