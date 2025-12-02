const poapService = require('../services/poap.service');
    const POAP = require('../models/poap.model');
    const Event = require('../models/event.model');
    const User = require('../models/user.model');
    const QRCode = require('qrcode');
    const crypto = require('crypto');

    exports.generateEventQR = async (req, res) => {
        try {
            const { eventId } = req.params;
            const event = await Event.findById(eventId);
            if (!event) return res.status(404).json({ message: 'Event not found' });
            
            const token = crypto.randomBytes(32).toString('hex');
            event.checkInToken = token;
            // Valid for 24 hours from NOW (for testing)
            event.checkInTokenExpiry = new Date(Date.now() + 24*60*60*1000); 
            await event.save();
            
            // NOTE: Ensure FRONTEND_URL is set in .env, or hardcode your Vercel URL
            const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const checkInUrl = `${baseUrl}/poap/checkin?token=${token}&eventId=${eventId}`;
            const qrCode = await QRCode.toDataURL(checkInUrl);
            
            res.json({ qrCode, checkInUrl });
        } catch (e) { res.status(500).json({ message: "QR Error" }); }
    };

    exports.claimPOAP = async (req, res) => {
        try {
            const { token, eventId, gps } = req.body;
            const userId = req.user.id;

            const event = await Event.findById(eventId);
            if (!event || event.checkInToken !== token) 
                return res.status(400).json({ message: "Invalid QR" });
            
            // Validate GPS
            if (event.location && event.location.latitude) {
                if (!poapService.validateLocation(gps.latitude, gps.longitude, event.location.latitude, event.location.longitude)) {
                    return res.status(403).json({ message: "You are not at the venue!" });
                }
            }

            const student = await User.findById(userId);
            if (!student.walletAddress) return res.status(400).json({ message: "Connect Wallet first" });

            const existing = await POAP.findOne({ studentWallet: student.walletAddress, eventId });
            if (existing) return res.status(400).json({ message: "Already claimed!" });

            // Mint
            const result = await poapService.mintPOAP(student.walletAddress, {
                eventId: event._id,
                eventName: event.name,
                eventDate: event.date
            }, gps);

            // Save DB
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

            // Add to event participants
            event.participants.push({ name: student.name, email: student.email });
            await event.save();

            res.json({ success: true, message: "POAP Minted!" });

        } catch (e) {
            console.error(e);
            res.status(500).json({ message: "Claim Failed" });
        }
    };
    
    exports.getMyPOAPs = async (req, res) => {
        try {
            const poaps = await POAP.find({ studentEmail: req.user.email }).sort({createdAt: -1});
            res.json(poaps);
        } catch(e) { res.status(500).json({message: "Error"}); }
    };