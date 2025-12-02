// In server/controllers/verifier.controller.js
const Certificate = require('../models/certificate.model');
const User = require('../models/user.model');

exports.searchCredentials = async (req, res) => {
    const { query } = req.query; // e.g., /api/verifier/search?query=Python

    if (!query) {
        return res.status(400).json({ message: 'A search query is required.' });
    }

    try {
        // 1. Find all certificates that match the event name (case-insensitive)
        const certificates = await Certificate.find({ 
            eventName: { $regex: query, $options: 'i' } 
        })
        .populate('issuedBy', 'name'); // Get the issuer's name

        if (certificates.length === 0) {
            return res.json([]); // Return an empty list, not an error
        }

        // 2. Get the student details for each certificate
        // We'll create a public-safe list of holders
        const holders = await Promise.all(certificates.map(async (cert) => {
            const student = await User.findOne({ email: cert.studentEmail });
            return {
                studentName: cert.studentName,
                eventName: cert.eventName,
                issuedOn: cert.createdAt,
                issuedBy: cert.issuedBy.name,
                walletAddress: student?.walletAddress || 'Not Connected',
                certificateId: cert.certificateId,
                transactionHash: cert.transactionHash
            };
        }));

        res.status(200).json(holders);

    } catch (error) {
        console.error('Verifier search failed:', error);
        res.status(500).json({ message: 'Server error during search.' });
    }
};