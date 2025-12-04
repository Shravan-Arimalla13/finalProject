// In server/controllers/certificate.controller.js
const Certificate = require('../models/certificate.model');
const Event = require('../models/event.model');
const User = require('../models/user.model');
const { nanoid } = require('nanoid');
const crypto = require('crypto');
const { getAddress } = require('ethers/address');

// --- CRITICAL FIX: Import Specific Ethers Utility ---
// This is the correct way to import getAddress in a Node.js CJS module
const { getAddress } = require('ethers/address'); 

// --- IMPORTS FOR BUSINESS LOGIC ---
const { mintNFT, isHashValid, revokeByHash } = require('../utils/blockchain');
const { generateCertificatePDF, createPDFBuffer } = require('../utils/certificateGenerator'); 
const { sendCertificateIssued } = require('../utils/mailer'); 
const { logActivity } = require('../utils/logger');
const ipfsService = require('../services/ipfs.service');


// Helper function to escape regex characters (used in verifyCertificate)
function escapeRegExp(string) {
    if (!string) return '';
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// --- ISSUE SINGLE CERTIFICATE ---
exports.issueSingleCertificate = async (req, res) => {
    const { eventName, eventDate, studentName, studentEmail } = req.body;
    const issuerId = req.user.id;

    if (!eventName || !eventDate || !studentName || !studentEmail) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const normalizedEmail = studentEmail.toLowerCase();

    try {
        const student = await User.findOne({ email: normalizedEmail });
        if (!student) return res.status(404).json({ message: 'Student account not found.' });
        if (!student.walletAddress) return res.status(400).json({ message: `Student (${student.name}) has not connected their wallet.` });

        const existingCert = await Certificate.findOne({ eventName, studentEmail: normalizedEmail });
        if (existingCert) return res.status(400).json({ message: 'Certificate already exists.' });

        // 1. FIX: NORMALIZE WALLET ADDRESS BEFORE MINTING 
        const studentWallet = getAddress(student.walletAddress);
        
        // 2. Fetch Event Config (CRITICAL FOR IPFS PDF)
        const event = await Event.findOne({ name: eventName });
        const config = event?.certificateConfig || {};

        // 3. Generate IDs & Hash
        const certificateId = `CERT-${nanoid(10)}`;
        const hashData = normalizedEmail + eventDate + eventName;
        const certificateHash = crypto.createHash('sha256').update(hashData).digest('hex');
        
        // 4. Mint NFT
        const { transactionHash, tokenId } = await mintNFT(studentWallet, certificateHash);

        // 5. IPFS UPLOAD
        let ipfsHash = null;
        let ipfsUrl = null;

        try {
            const certDataForPDF = {
                certificateId, studentName, eventName, eventDate,
                studentEmail: normalizedEmail, config: config,
                studentDepartment: student.department, studentSemester: student.semester
            };

            const pdfBuffer = await createPDFBuffer(certDataForPDF);
            const ipfsResult = await ipfsService.uploadCertificate(pdfBuffer, certDataForPDF);
            
            if (ipfsResult) {
                ipfsHash = ipfsResult.ipfsHash;
                ipfsUrl = ipfsResult.ipfsUrl;
            } 
        } catch (ipfsError) {
            console.error("IPFS Upload Warning (Failed but non-critical):", ipfsError.message);
        }

        // 6. Save to DB
        const newCert = new Certificate({
            certificateId,
            tokenId: tokenId.toString(),
            certificateHash,
            transactionHash,
            studentName,
            studentEmail: normalizedEmail,
            eventName,
            eventDate,
            issuedBy: issuerId,
            verificationUrl: `/verify/${certificateId}`,
            ipfsHash,
            ipfsUrl
        });

        await newCert.save();

        // 7. Email & Log
        await sendCertificateIssued(normalizedEmail, studentName, eventName, certificateId);
        await logActivity(req.user, "CERTIFICATE_ISSUED", `Issued NFT to ${studentName} for ${eventName}`);

        res.status(201).json({ message: 'NFT Issued & IPFS Uploaded ✅', certificate: newCert });

    } catch (error) {
        console.error('Error issuing single certificate:', error);
        res.status(500).json({ message: error.message });
    }
};

// --- ISSUE EVENT CERTIFICATES (BULK) ---
exports.issueEventCertificates = async (req, res) => {
    const eventId = req.params.eventId;
    const issuerId = req.user.id;
    let issuedCount = 0;
    let skippedCount = 0;
    const errors = [];

    try {
        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        
        for (const participant of event.participants) {
            const normalizedEmail = participant.email.toLowerCase();
            const student = await User.findOne({ email: normalizedEmail });
            
            if (!student || !student.walletAddress) {
                errors.push(`Skipped ${participant.name}: Wallet not connected.`);
                skippedCount++;
                continue;
            }

            if (await Certificate.findOne({ eventName: event.name, studentEmail: normalizedEmail })) {
                skippedCount++;
                continue;
            }
            
            // FIX: NORMALIZE WALLET ADDRESS IN BULK LOOP
            const studentWallet = getAddress(student.walletAddress);

            const hashData = normalizedEmail + event.date + event.name;
            const certificateHash = crypto.createHash('sha256').update(hashData).digest('hex');

            try {
                const { transactionHash, tokenId } = await mintNFT(studentWallet, certificateHash);
                const certificateId = `CERT-${nanoid(10)}`;
                
                // IPFS Logic for Bulk
                let ipfsHash = null;
                let ipfsUrl = null;
                try {
                     const certDataForPDF = {
                        certificateId,
                        studentName: participant.name,
                        eventName: event.name,
                        eventDate: event.date,
                        studentEmail: normalizedEmail,
                        config: event.certificateConfig,
                        studentDepartment: student.department,
                        studentSemester: student.semester
                    };
                     const pdfBuffer = await createPDFBuffer(certDataForPDF);
                     const ipfsResult = await ipfsService.uploadCertificate(pdfBuffer, certDataForPDF);
                     if (ipfsResult) {
                         ipfsHash = ipfsResult.ipfsHash;
                         ipfsUrl = ipfsResult.ipfsUrl;
                     }
                } catch (e) { console.error("Bulk IPFS Error:", e.message); }

                const newCert = new Certificate({
                    certificateId, tokenId: tokenId.toString(), certificateHash, transactionHash,
                    studentName: participant.name, studentEmail: normalizedEmail,
                    eventName: event.name, eventDate: event.date,
                    issuedBy: issuerId, verificationUrl: `/verify/${certificateId}`,
                    ipfsHash, ipfsUrl
                });
                await newCert.save();
                
                sendCertificateIssued(normalizedEmail, participant.name, event.name, certificateId);
                issuedCount++;
            } catch (mintError) {
                errors.push(`Failed ${participant.name}: ${mintError.message}`);
                skippedCount++;
            }
        }

        event.certificatesIssued = true;
        await event.save();

        if (issuedCount > 0) {
            await logActivity(req.user, "BULK_ISSUE", `Issued ${issuedCount} NFTs for event: ${event.name}`);
        }

        res.status(201).json({ message: `Successfully issued ${issuedCount} NFTs.`, errors });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// --- VERIFY CERTIFICATE ---
exports.verifyCertificate = async (req, res) => {
    try {
        const { certId } = req.params;
        const safeCertId = escapeRegExp(certId); 

        const certificate = await Certificate.findOne({ 
            certificateId: { $regex: new RegExp(`^${safeCertId}$`, 'i') } 
        }).populate('issuedBy', 'name');

        if (!certificate) return res.status(404).json({ message: 'Certificate not found or invalid.' });

        const event = await Event.findOne({ name: certificate.eventName });
        const config = event?.certificateConfig || {};

        certificate.scanCount += 1;
        await certificate.save();

        const { exists, isRevoked } = await isHashValid(certificate.certificateHash);

        res.json({
            studentName: certificate.studentName,
            eventName: certificate.eventName,
            eventDate: certificate.eventDate,
            issuedBy: certificate.issuedBy.name,
            issuedOn: certificate.createdAt,
            certificateHash: certificate.certificateHash,
            transactionHash: certificate.transactionHash,
            certificateId: certificate.certificateId,
            isBlockchainVerified: exists,
            isRevoked: isRevoked,
            design: {
                logo: config.collegeLogo,
                signature: config.signatureImage,
                collegeName: config.collegeName,
                title: config.certificateTitle,
                dept: config.headerDepartment
            },
            ipfsUrl: certificate.ipfsUrl
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// --- GET MY CERTIFICATES ---
exports.getMyCertificates = async (req, res) => {
    try {
        const certificates = await Certificate.find({ studentEmail: req.user.email }).populate('issuedBy', 'name').sort({ eventDate: -1 });
        res.json(certificates);
    } catch (error) { res.status(500).send('Server Error'); }
};

// --- DOWNLOAD PDF ---
exports.downloadCertificate = async (req, res) => {
    try {
        const certificate = await Certificate.findOne({ certificateId: req.params.certId }).populate('issuedBy', 'name');
        if (!certificate) return res.status(404).json({ message: 'Certificate not found' });
        
        // --- FIX: Download IPFS link if available ---
        if (certificate.ipfsUrl) {
            // Redirect the client to the IPFS gateway
            return res.redirect(certificate.ipfsUrl); 
        }

        const event = await Event.findOne({ name: certificate.eventName });
        const studentUser = await User.findOne({ email: certificate.studentEmail });
        const certData = { ...certificate.toObject(), config: event?.certificateConfig || {}, studentDepartment: studentUser?.department || 'N/A', studentSemester: studentUser?.semester || '___' };
        
        // Fallback: Generate PDF on the fly
        await generateCertificatePDF(certData, res); 
    } catch (error) { res.status(500).send('Server Error'); }
};

// --- REVOKE CERTIFICATE ---
exports.revokeCertificate = async (req, res) => {
    const { certificateId } = req.body;
    try {
        const certificate = await Certificate.findOne({ certificateId: certificateId });
        if (!certificate) return res.status(404).json({ message: 'Certificate not found.' });

        await revokeByHash(certificate.certificateHash);
        await logActivity(req.user, "CERTIFICATE_REVOKED", `Revoked certificate ID: ${certificateId}`);

        res.status(200).json({ message: 'Certificate successfully revoked on the blockchain.' });
    } catch (error) {
        console.error('Revocation failed:', error);
        res.status(500).json({ message: 'Server error during revocation.' });
    }
};