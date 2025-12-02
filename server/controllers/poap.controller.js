// In server/controllers/poap.controller.js
const poapService = require('../services/poap.service');
const POAP = require('../models/poap.model');
const Event = require('../models/event.model');
const User = require('../models/user.model');
const QRCode = require('qrcode');
const crypto = require('crypto');

// --- 1. GENERATE QR CODE (Faculty) ---
exports.generateEventQR = async (req, res) => {
    try {
        const { eventId } = req.params;
        
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        
        // Create unique check-in token (expires after event)
        const checkInToken = crypto.randomBytes(32).toString('hex');
        
        // Store token temporarily
        event.checkInToken = checkInToken;
        event.checkInTokenExpiry = new Date(Date.now() + 24*60*60*1000); // 24 hours from now
        await event.save();
        
        // Generate QR code containing check-in URL
        // Ensure this matches your Frontend URL
        const baseUrl = "https://the-blockchain-based-skill-credenti.vercel.app";
        const checkInUrl = `${baseUrl}/poap/checkin?token=${checkInToken}&eventId=${eventId}`;
        
        const qrCodeDataURL = await QRCode.toDataURL(checkInUrl, {
            width: 400,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        
        res.json({
            qrCode: qrCodeDataURL,
            checkInUrl: checkInUrl,
            expiresAt: event.checkInTokenExpiry
        });
        
    } catch (error) {
        console.error('QR Generation Error:', error);
        res.status(500).json({ message: 'QR generation failed' });
    }
};

// --- 2. CLAIM POAP (Student) ---
exports.claimPOAP = async (req, res) => {
    try {
        const { token, eventId, gps } = req.body;
        const studentId = req.user.id;
        
        // 1. Validate event and token
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        
        if (event.checkInToken !== token) {
            return res.status(400).json({ message: 'Invalid or expired QR code' });
        }
        
        if (new Date() > event.checkInTokenExpiry) {
            return res.status(400).json({ message: 'Check-in period has ended' });
        }
        
        // 2. Get student details
        const student = await User.findById(studentId);
        if (!student.walletAddress) {
            return res.status(400).json({ 
                message: 'Please connect your wallet first to receive POAP' 
            });
        }
        
        // 3. Validate GPS location (if event has physical location)
        if (event.location && event.location.latitude && gps) {
            const isAtVenue = poapService.validateLocation(
                gps.latitude,
                gps.longitude,
                event.location.latitude,
                event.location.longitude,
                0.5 // 500m radius
            );
            
            if (!isAtVenue) {
                return res.status(403).json({ 
                    message: 'You must be at the event venue to claim POAP',
                    distance: 'Too far from venue'
                });
            }
        }
        
        // 4. Generate event hash
        const eventHash = poapService.generateEventHash(
            event._id,
            event.name,
            event.date
        );
        
        // 5. Check if already claimed
        const alreadyClaimed = await POAP.findOne({
            studentWallet: student.walletAddress.toLowerCase(),
            eventHash: eventHash
        });
        
        if (alreadyClaimed) {
            return res.status(400).json({ 
                message: 'You have already claimed POAP for this event',
                tokenId: alreadyClaimed.tokenId
            });
        }
        
        // 6. Mint POAP on blockchain
        const mintResult = await poapService.mintPOAP(
            student.walletAddress,
            {
                eventId: event._id,
                eventName: event.name,
                eventDate: event.date
            },
            gps || { latitude: 0, longitude: 0 }
        );
        
        // 7. Save to database
        const poap = new POAP({
            tokenId: mintResult.tokenId,
            transactionHash: mintResult.transactionHash,
            eventHash: eventHash,
            eventId: event._id,
            eventName: event.name,
            eventDate: event.date,
            eventLocation: event.location,
            studentWallet: student.walletAddress.toLowerCase(),
            studentEmail: student.email,
            studentName: student.name,
            checkInLocation: gps,
            deviceInfo: {
                userAgent: req.headers['user-agent'],
                ipAddress: req.ip
            },
            verificationMethod: 'QR_SCAN',
            issuer: req.user.id
        });
        
        await poap.save();
        
        // 8. Add participation to event
        event.participants.push({
            name: student.name,
            email: student.email
        });
        await event.save();
        
        res.status(201).json({
            message: 'POAP claimed successfully!',
            poap: {
                tokenId: poap.tokenId,
                transactionHash: poap.transactionHash,
                eventName: poap.eventName,
                verificationUrl: poap.verificationUrl
            }
        });
        
    } catch (error) {
        console.error('POAP Claim Error:', error);
        res.status(500).json({ 
            message: 'POAP claim failed',
            error: error.message 
        });
    }
};

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
        
        // Verify on blockchain
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
        
        // Revoke on blockchain
        const txHash = await poapService.revokePOAP(tokenId, reason);
        
        // Update database
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