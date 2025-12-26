// server/controllers/poap.controller.js - FIXED: 20-MINUTE WINDOW
const poapService = require('../services/poap.service');
const POAP = require('../models/poap.model');
const Event = require('../models/event.model');
const User = require('../models/user.model');
const QRCode = require('qrcode');
const crypto = require('crypto');
const { getAddress } = require('ethers/address');
const { getCurrentIST, formatISTDisplay } = require('../utils/timezone');

// ============================================
// 1. GENERATE QR CODE - FIXED: 20-MINUTE WINDOW
// ============================================
// server/controllers/poap.controller.js - ENHANCED ERROR RESPONSES

// Replace the generateEventQR function:

exports.generateEventQR = async (req, res) => {
    try {
        const { eventId } = req.params;
        const event = await Event.findById(eventId);
        
        if (!event) {
            return res.status(404).json({ 
                message: 'Event not found',
                error: 'EVENT_NOT_FOUND'
            });
        }
        
        // Validate 20-minute window
        const liveCheck = poapService.validateEventIsLive(event.date, event.startTime, event.endTime);
        
        if (!liveCheck.isLive) {
            // Calculate exact times for helpful error message
            const eventDate = new Date(event.date);
            const [startHour, startMin] = event.startTime.split(':').map(Number);
            const [endHour, endMin] = event.endTime.split(':').map(Number);
            
            const qrOpenTime = new Date(eventDate);
            qrOpenTime.setHours(startHour, startMin - 20, 0); // 20 min before
            
            const qrCloseTime = new Date(eventDate);
            qrCloseTime.setHours(endHour, endMin + 20, 0); // 20 min after
            
            return res.status(400).json({
                message: liveCheck.message,
                status: liveCheck.status,
                currentIST: liveCheck.currentIST,
                eventDetails: {
                    name: event.name,
                    date: eventDate.toLocaleDateString('en-IN'),
                    startTime: event.startTime,
                    endTime: event.endTime,
                    qrWindowOpens: qrOpenTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                    qrWindowCloses: qrCloseTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                },
                hint: liveCheck.status === 'TOO_EARLY' 
                    ? `QR generation will be available 20 minutes before the event starts (${event.startTime} IST)`
                    : `QR generation is only available until 20 minutes after the event ends (${event.endTime} IST)`,
                error: liveCheck.status
            });
        }
        
        const now = getCurrentIST();
        const checkInToken = crypto.randomBytes(32).toString('hex');
        
        // Store QR metadata
        event.checkInToken = checkInToken;
        event.qrGeneratedAt = now;
        event.qrExpiresAt = new Date(now.getTime() + 10 * 60 * 1000);
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
        
        console.log(`✅ QR Generated for "${event.name}" (Status: ${liveCheck.status})`);
        
        res.json({ 
            qrCode: qrCode, 
            checkInUrl: checkInUrl,
            generatedAt: now.toISOString(),
            expiresAt: event.qrExpiresAt.toISOString(),
            validityMinutes: 10,
            eventStatus: liveCheck.status,
            message: liveCheck.message
        });
        
    } catch (error) {
        console.error('❌ QR Generation Error:', error);
        res.status(500).json({ 
            message: 'Failed to generate QR code. Please try again.',
            error: 'SERVER_ERROR',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Replace the claimPOAP function:

exports.claimPOAP = async (req, res) => {
    try {
        const { token, eventId, gps } = req.body;
        const studentId = req.user.id;

        // Validate required fields
        if (!token || !eventId || !gps) {
            return res.status(400).json({ 
                message: 'Missing required fields: token, eventId, or GPS coordinates',
                error: 'MISSING_FIELDS'
            });
        }

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ 
                message: 'Event not found in the system',
                error: 'EVENT_NOT_FOUND'
            });
        }

        // Validate token
        if (event.checkInToken !== token) {
            return res.status(400).json({ 
                message: 'Invalid or expired QR code',
                error: 'INVALID_TOKEN',
                hint: 'This QR code is not recognized. Ask faculty to generate a new one.'
            });
        }

        // Check for QR metadata
        if (!event.qrGeneratedAt) {
            return res.status(400).json({
                message: 'QR code metadata is missing',
                error: 'MISSING_QR_METADATA',
                hint: 'The QR code is corrupted. Ask faculty to generate a fresh QR code.'
            });
        }

        // Validate QR expiry
        const qrValidation = poapService.validateQRToken(event.qrGeneratedAt, token);
        
        if (!qrValidation.isValid) {
            const minutesExpired = Math.floor((Date.now() - new Date(event.qrGeneratedAt).getTime()) / 60000);
            
            return res.status(400).json({
                message: qrValidation.message,
                error: 'QR_EXPIRED',
                expired: true,
                details: {
                    generatedAt: event.qrGeneratedAt,
                    expiryTime: 10, // minutes
                    minutesSinceGeneration: minutesExpired
                },
                instruction: 'Ask your faculty to generate a new QR code'
            });
        }
        
        console.log(`⏱️ QR Valid - ${qrValidation.remainingSeconds}s remaining`);
        
        // Check wallet
        const student = await User.findById(studentId);
        if (!student) {
            return res.status(404).json({ 
                message: 'Student account not found',
                error: 'USER_NOT_FOUND'
            });
        }
        
        if (!student.walletAddress) {
            return res.status(400).json({ 
                message: 'Wallet not connected. Please connect MetaMask from Dashboard first.',
                error: 'NO_WALLET',
                hint: 'Go to Dashboard → Connect MetaMask → Return here'
            });
        }

        const studentWallet = getAddress(student.walletAddress.toLowerCase());
        
        // Check for duplicate
        const existingPOAP = await POAP.findOne({
            studentEmail: student.email,
            eventId: event._id
        });
        
        if (existingPOAP) {
            return res.status(400).json({
                message: 'You have already claimed your POAP for this event',
                error: 'ALREADY_CLAIMED',
                poap: {
                    tokenId: existingPOAP.tokenId,
                    checkInTime: existingPOAP.checkInTime,
                    attendanceScore: existingPOAP.attendanceScore
                }
            });
        }
        
        // Calculate attendance score
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
                : `⏰ Score: ${attendanceScore}% (checked in ${Math.floor((checkInTime - new Date(event.qrGeneratedAt)) / 60000)} min after QR generation)`,
            poap: {
                tokenId: newPOAP.tokenId,
                transactionHash: newPOAP.transactionHash,
                checkInTime: newPOAP.checkInTime,
                attendanceScore: newPOAP.attendanceScore
            }
        });
        
    } catch (error) {
        console.error('❌ POAP Claim Error:', error);
        
        // Handle specific blockchain or GPS errors
        if (error.message.includes('away') || error.message.includes('km')) {
            return res.status(400).json({
                message: error.message,
                error: 'LOCATION_MISMATCH',
                hint: 'You must be physically present at the event venue'
            });
        }
        
        res.status(500).json({ 
            message: 'POAP claim failed due to server error',
            error: 'SERVER_ERROR',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again or contact support'
        });
    }
};
// ============================================
// 2. CLAIM POAP - ENHANCED ERROR HANDLING
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
                message: 'Invalid or expired QR code. Ask faculty to generate a new one.' 
            });
        }

        // Validate QR expiry (10 minutes)
        if (!event.qrGeneratedAt) {
            return res.status(400).json({
                message: 'QR code metadata missing. Please ask faculty to regenerate QR.',
                error: 'MISSING_QR_METADATA'
            });
        }

        const qrValidation = poapService.validateQRToken(event.qrGeneratedAt, token);
        
        if (!qrValidation.isValid) {
            return res.status(400).json({
                message: qrValidation.message,
                expired: true,
                error: 'QR_EXPIRED',
                instruction: 'Ask your faculty to generate a fresh QR code'
            });
        }
        
        console.log(`⏱️ QR Valid - ${qrValidation.remainingSeconds}s remaining`);
        
        const student = await User.findById(studentId);
        if (!student || !student.walletAddress) {
            return res.status(400).json({ 
                message: 'Wallet not connected. Please connect your wallet first.',
                error: 'NO_WALLET'
            });
        }

        const studentWallet = getAddress(student.walletAddress.toLowerCase());
        
        // Check for duplicate claim
        const existingPOAP = await POAP.findOne({
            studentEmail: student.email,
            eventId: event._id
        });
        
        if (existingPOAP) {
            return res.status(400).json({
                message: 'You have already claimed your POAP for this event!',
                error: 'ALREADY_CLAIMED',
                poap: existingPOAP
            });
        }
        
        // Calculate score based on QR generation time
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
            poap: {
                tokenId: newPOAP.tokenId,
                transactionHash: newPOAP.transactionHash,
                checkInTime: newPOAP.checkInTime,
                attendanceScore: newPOAP.attendanceScore
            }
        });
        
    } catch (error) {
        console.error('POAP Claim Error:', error);
        
        // Provide specific error messages
        if (error.message.includes('already claimed')) {
            return res.status(400).json({ 
                message: 'You have already claimed your POAP for this event!',
                error: 'ALREADY_CLAIMED'
            });
        }
        
        if (error.message.includes('away')) {
            return res.status(400).json({
                message: error.message,
                error: 'LOCATION_MISMATCH'
            });
        }
        
        res.status(500).json({ 
            message: 'POAP claim failed: ' + error.message,
            error: 'SERVER_ERROR'
        });
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
            onTime: attendees.filter(a => a.attendanceScore === 100).length,
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