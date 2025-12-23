// server/controllers/poap.controller.js - COMPLETE CONTROLLER
const poapService = require('../services/poap.service');
const POAP = require('../models/poap.model');
const Event = require('../models/event.model');
const User = require('../models/user.model');
const QRCode = require('qrcode');
const crypto = require('crypto');
const { getAddress } = require('ethers/address');

// ============================================
// 1. GENERATE QR CODE FOR EVENT CHECK-IN
// ============================================

/**
 * Generate QR code and check-in link for an event
 * POST /api/poap/event/:eventId/qr
 */
exports.generateEventQR = async (req, res) => {
    try {
        const { eventId } = req.params;
        const event = await Event.findById(eventId);
        
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        
        // Generate unique check-in token
        const checkInToken = crypto.randomBytes(32).toString('hex');
        
        // Store token in event (expires 24 hours after event date)
        event.checkInToken = checkInToken;
        event.checkInTokenExpiry = new Date(
            new Date(event.date).getTime() + 24 * 60 * 60 * 1000
        );
        await event.save();
        
        // Build check-in URL
        const baseUrl = process.env.FRONTEND_URL || "https://final-project-wheat-mu-84.vercel.app";
        const checkInUrl = `${baseUrl}/poap-checkin?token=${checkInToken}&eventId=${eventId}`;
        
        // Generate QR code
        const qrCode = await QRCode.toDataURL(checkInUrl, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            width: 400,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        
        console.log(`✅ QR code generated for event: ${event.name}`);
        
        res.json({ 
            qrCode: qrCode, 
            checkInUrl: checkInUrl,
            expiresAt: event.checkInTokenExpiry
        });
        
    } catch (error) {
        console.error('QR Generation Error:', error);
        res.status(500).json({ message: 'QR generation failed: ' + error.message });
    }
};

// ============================================
// 2. CLAIM POAP (Student Check-In)
// ============================================

/**
 * Claim POAP by checking in with GPS verification
 * POST /api/poap/claim
 */
exports.claimPOAP = async (req, res) => {
    try {
        const { token, eventId, gps } = req.body;
        const studentId = req.user.id;

        // Validate inputs
        if (!token || !eventId || !gps) {
            return res.status(400).json({ 
                message: 'Missing required fields: token, eventId, gps' 
            });
        }

        // Fetch event
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Verify check-in token
        if (event.checkInToken !== token) {
            return res.status(400).json({ 
                message: 'Invalid or expired QR code. Please request a new one.' 
            });
        }

        // Check if token is expired
        if (new Date() > new Date(event.checkInTokenExpiry)) {
            return res.status(400).json({ 
                message: 'Check-in period has expired.' 
            });
        }
        
        // Fetch student
        const student = await User.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Check if wallet is connected
        if (!student.walletAddress) {
            return res.status(400).json({ 
                message: 'Please connect your Web3 wallet first to receive POAP' 
            });
        }

        // Normalize wallet address
        const studentWallet = getAddress(student.walletAddress.toLowerCase());
        
        // Validate GPS data
        if (!gps.latitude || !gps.longitude) {
            return res.status(400).json({ 
                message: 'Valid GPS coordinates are required for check-in.' 
            });
        }
        
        // Validate time window
        const timeCheck = poapService.validateCheckInTime(
            event.date, 
            event.startTime, 
            event.endTime
        );
        
        if (!timeCheck.isValid) {
            return res.status(400).json({ message: timeCheck.message });
        }
        
        // Generate event hash
        const eventHash = poapService.generateEventHash(
            event._id, 
            event.name, 
            event.date
        );
        
        // Check if already claimed
        const existingPOAP = await POAP.findOne({ 
            studentWallet: studentWallet.toLowerCase(), 
            eventHash: eventHash 
        });
        
        if (existingPOAP) {
            return res.status(400).json({ 
                message: 'You have already claimed your POAP for this event.',
                tokenId: existingPOAP.tokenId
            });
        }
        
        // Calculate attendance score
        const attendanceScore = poapService.calculateAttendanceScore(
            event.date,
            event.startTime,
            new Date()
        );
        
        console.log(`📊 Attendance Score: ${attendanceScore}/100`);
        
        // Mint POAP on blockchain
        const mintResult = await poapService.mintPOAP(
            studentWallet,
            { 
                eventId: event._id, 
                eventName: event.name, 
                eventDate: event.date 
            },
            gps,
            event.location // Pass event location for GPS validation
        );
        
        // Save to database
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
        
        console.log(`✅ POAP saved to database: Token #${newPOAP.tokenId}`);
        
        res.status(201).json({ 
            success: true, 
            message: 'POAP claimed successfully!',
            poap: {
                tokenId: newPOAP.tokenId,
                transactionHash: newPOAP.transactionHash,
                eventName: newPOAP.eventName,
                attendanceScore: attendanceScore,
                checkInTime: newPOAP.checkInTime
            }
        });
        
    } catch (error) {
        console.error('POAP Claim Error:', error);
        res.status(500).json({ 
            message: 'POAP claim failed: ' + error.message 
        });
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