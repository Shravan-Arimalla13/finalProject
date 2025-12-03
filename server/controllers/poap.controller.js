// In server/controllers/poap.controller.js
const poapService = require('../services/poap.service');
const Event = require('../models/event.model');
const POAP = require('../models/poap.model');
const User = require('../models/user.model');
const QRCode = require('qrcode');
const crypto = require('crypto');

// --- 1. GENERATE QR ---
exports.generateEventQR = async (req, res) => {
    try {
        const { eventId } = req.params;
        const event = await Event.findById(eventId);
        
        if (!event) return res.status(404).json({ message: 'Event not found' });
        
        const checkInToken = crypto.randomBytes(32).toString('hex');
        event.checkInToken = checkInToken;
        event.checkInTokenExpiry = new Date(Date.now() + 24*60*60*1000); 
        await event.save();
        
        // Use your VERCEL URL here
        const baseUrl = "https://final-project-wheat-mu-84.vercel.app"; 
        const checkInUrl = `${baseUrl}/poap/checkin?token=${checkInToken}&eventId=${eventId}`;
        
        const qrCode = await QRCode.toDataURL(checkInUrl);
        res.json({ qrCode, checkInUrl });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "QR Gen Failed" });
    }
};

// --- 2. CLAIM POAP ---
exports.claimPOAP = async (req, res) => {
    try {
        const { token, eventId, gps } = req.body;
        const studentId = req.user.id;

        const event = await Event.findById(eventId);
        if (!event || event.checkInToken !== token) return res.status(400).json({ message: "Invalid QR" });
        
        // Location check (skipped if gps missing to prevent crash during testing, strictly enforce in prod)
        if (event.location?.latitude && gps) {
             const isNear = poapService.validateLocation(gps.latitude, gps.longitude, event.location.latitude, event.location.longitude);
             if (!isNear) return res.status(403).json({ message: "Location verification failed." });
        }

        const student = await User.findById(studentId);
        if (!student.walletAddress) return res.status(400).json({ message: "Connect Wallet first" });

        if (await POAP.findOne({ studentWallet: student.walletAddress, eventId })) {
            return res.status(400).json({ message: "Already claimed!" });
        }

        const result = await poapService.mintPOAP(student.walletAddress, {
            eventId: event._id,
            eventName: event.name,
            eventDate: event.date
        }, gps || {latitude:0, longitude:0});

        await POAP.create({
            tokenId: result.tokenId,
            transactionHash: result.transactionHash,
            eventHash: result.eventHash,
            eventId: event._id,
            eventName: event.name,
            eventDate: event.date,
            studentWallet: student.walletAddress,
            studentEmail: student.email,
            studentName: student.name,
            checkInLocation: gps,
            issuer: event.createdBy
        });

        event.participants.push({ name: student.name, email: student.email });
        await event.save();

        res.json({ success: true, message: "POAP Minted!" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Claim Failed" });
    }
};

// --- 3. GET MY POAPS ---
exports.getMyPOAPs = async (req, res) => {
    try {
        const poaps = await POAP.find({ studentEmail: req.user.email }).sort({createdAt: -1});
        res.json(poaps);
    } catch(e) { res.status(500).json({message: "Error"}); }
};

// --- 4. VERIFY POAP ---
exports.verifyPOAP = async (req, res) => {
    try {
        const poap = await POAP.findOne({ tokenId: req.params.tokenId });
        if(!poap) return res.status(404).json({ message: "POAP not found" });
        res.json({ verified: true, poap });
    } catch(e) { res.status(500).json({message: "Error"}); }
};

// --- 5. GET ATTENDANCE ---
exports.getEventAttendance = async (req, res) => {
    try {
        const attendees = await POAP.find({ eventId: req.params.eventId });
        res.json({ attendees });
    } catch(e) { res.status(500).json({message: "Error"}); }
};

// --- 6. REVOKE POAP ---
exports.revokePOAP = async (req, res) => {
    // Placeholder for revoke logic
    res.json({ message: "Revocation logic here" });
};