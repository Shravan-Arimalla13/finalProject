// server/controllers/certificate.controller.js - COMPLETE FIXED VERSION
const Certificate = require('../models/certificate.model');
const Event = require('../models/event.model');
const User = require('../models/user.model');
const POAP = require('../models/poap.model');
const { nanoid } = require('nanoid');
const crypto = require('crypto');
const { getAddress } = require('ethers/address');
const { mintNFT, isHashValid, revokeByHash } = require('../utils/blockchain');
const { generateCertificatePDF, createPDFBuffer } = require('../utils/certificateGenerator');
const { sendCertificateIssued } = require('../utils/mailer');
const { logActivity } = require('../utils/logger');
const ipfsService = require('../services/ipfs.service');
const { getCurrentIST, getEventStatusIST } = require('../utils/timezone');

// Helper function to escape regex characters (used in verifyCertificate)
function escapeRegExp(string) {
    if (!string) return '';
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Helper function to normalize email
function normalizeEmail(email) {
    if (!email || typeof email !== 'string') return null;
    return email.toLowerCase().trim();
}

// Helper function to normalize wallet address
function normalizeWalletAddress(address) {
    if (!address || typeof address !== 'string') return null;
    try {
        return getAddress(address.toLowerCase());
    } catch (error) {
        throw new Error('Invalid Ethereum address format');
    }
}

// Helper function to calculate event status
function calculateEventStatus(eventDate, startTime, endTime) {
    const now = new Date();
    const eventDateStr = new Date(eventDate).toISOString().split('T')[0];
    const start = new Date(`${eventDateStr}T${startTime}:00`);
    const end = new Date(`${eventDateStr}T${endTime}:00`);
    
    if (now > end) return 'Completed';
    if (now >= start && now <= end) return 'Ongoing';
    return 'Upcoming';
}

// --- ISSUE SINGLE CERTIFICATE ---
exports.issueSingleCertificate = async (req, res) => {
    const { eventName, eventDate, studentName, studentEmail } = req.body;
    const issuerId = req.user.id;

    // Validate required fields
    if (!eventName || !eventDate || !studentName || !studentEmail) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const normalizedEmail = normalizeEmail(studentEmail);
    if (!normalizedEmail) {
        return res.status(400).json({ message: 'Invalid email format' });
    }

    try {
        // Find student
        const student = await User.findOne({ email: normalizedEmail });
        if (!student) {
            return res.status(404).json({ message: 'Student account not found.' });
        }
        
        if (!student.walletAddress) {
            return res.status(400).json({ 
                message: `Student (${student.name}) has not connected their wallet.` 
            });
        }

        // Check for duplicate certificate
        const existingCert = await Certificate.findOne({ 
            eventName, 
            studentEmail: normalizedEmail 
        });
        if (existingCert) {
            return res.status(400).json({ 
                message: 'Certificate already exists for this student and event.' 
            });
        }

        // 1. NORMALIZE WALLET ADDRESS with proper error handling
        let studentWallet;
        try {
            studentWallet = normalizeWalletAddress(student.walletAddress);
        } catch (error) {
            return res.status(400).json({ 
                message: 'Invalid wallet address format for student.' 
            });
        }
        
        // 2. Fetch Event Config
        const event = await Event.findOne({ name: eventName });
        const config = event?.certificateConfig || {};

        // 3. Generate IDs & Hash
        const certificateId = `CERT-${nanoid(10)}`;
        const hashData = normalizedEmail + eventDate + eventName;
        const certificateHash = crypto.createHash('sha256').update(hashData).digest('hex');
        
        // 4. Mint NFT with error handling
        let transactionHash, tokenId;
        try {
            const mintResult = await mintNFT(studentWallet, certificateHash);
            transactionHash = mintResult.transactionHash;
            tokenId = mintResult.tokenId;
        } catch (mintError) {
            console.error('NFT Minting Failed:', mintError);
            return res.status(500).json({ 
                message: 'Blockchain minting failed: ' + mintError.message 
            });
        }

        // 5. IPFS UPLOAD with proper error handling
        let ipfsHash = null;
        let ipfsUrl = null;

        try {
            const certDataForPDF = {
                certificateId, 
                studentName, 
                eventName, 
                eventDate,
                studentEmail: normalizedEmail, 
                config: config,
                studentDepartment: student.department || 'N/A', 
                studentSemester: student.semester || 'N/A'
            };

            const pdfBuffer = await createPDFBuffer(certDataForPDF);
            const ipfsResult = await ipfsService.uploadCertificate(pdfBuffer, certDataForPDF);
            
            if (ipfsResult) {
                ipfsHash = ipfsResult.ipfsHash;
                ipfsUrl = ipfsResult.ipfsUrl;
            } else {
                console.warn('⚠️ IPFS upload failed, but continuing with certificate creation');
            }
        } catch (ipfsError) {
            console.error("IPFS Upload Warning (non-critical):", ipfsError.message);
            // Continue without IPFS - certificate can still be downloaded from server
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

        // 7. Email & Log (non-blocking)
        sendCertificateIssued(normalizedEmail, studentName, eventName, certificateId)
            .catch(err => console.error('Email notification failed:', err.message));
            
        logActivity(req.user, "CERTIFICATE_ISSUED", 
            `Issued NFT to ${studentName} for ${eventName}`)
            .catch(err => console.error('Activity logging failed:', err.message));

        res.status(201).json({ 
            message: 'NFT Certificate issued successfully ✅', 
            certificate: {
                certificateId: newCert.certificateId,
                transactionHash: newCert.transactionHash,
                tokenId: newCert.tokenId,
                ipfsUrl: newCert.ipfsUrl,
                verificationUrl: newCert.verificationUrl
            }
        });

    } catch (error) {
        console.error('Error issuing single certificate:', error);
        res.status(500).json({ 
            message: 'Server error during certificate issuance',
            error: error.message 
        });
    }
};

// --- ISSUE EVENT CERTIFICATES (BULK) - WITH TIME LOCK ---
exports.issueEventCertificates = async (req, res) => {
    const eventId = req.params.eventId;
    const issuerId = req.user.id;
    let issuedCount = 0;
    let skippedCount = 0;
    const errors = [];

    try {
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // --- UPDATED TIME CHECK (IST BASED) ---
        const now = getCurrentIST();
        const eventStatus = getEventStatusIST(
            event.date,
            event.startTime,
            event.endTime
        );

        if (eventStatus !== 'Completed') {
            return res.status(400).json({ 
                message: `Cannot issue certificates until event ends at ${event.endTime} IST`,
                currentIST: now.toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata'
                })
            });
        }
        // -------------------------------------

        // Determine issuance type (all vs attended)
        const issueType = req.query.issueType; // 'all' or 'attended'
        let targetParticipants = event.participants || [];

        if (issueType === 'attended') {
            const poapAttendees = await POAP.find({ 
                eventId: event._id,
                isRevoked: false
            });

            if (poapAttendees.length === 0) {
                return res.status(400).json({
                    message: 'No students have checked in for this event yet.',
                    suggestion: 'Use "All Participants" option or wait for check-ins'
                });
            }

            const poapEmails = new Set(
                poapAttendees.map(p => normalizeEmail(p.studentEmail))
            );

            targetParticipants = event.participants.filter(p =>
                poapEmails.has(normalizeEmail(p.email))
            );
        }

        if (targetParticipants.length === 0) {
            return res.status(400).json({
                message: 'No participants found to issue certificates to.'
            });
        }

        // Process participants
        for (const participant of targetParticipants) {
            const normalizedEmail = normalizeEmail(participant.email);

            if (!normalizedEmail) {
                errors.push(`Skipped ${participant.name}: Invalid email.`);
                skippedCount++;
                continue;
            }

            const student = await User.findOne({ email: normalizedEmail });
            if (!student || !student.walletAddress) {
                skippedCount++;
                continue;
            }

            const existingCert = await Certificate.findOne({
                eventName: event.name,
                studentEmail: normalizedEmail
            });

            if (existingCert) {
                skippedCount++;
                continue;
            }

            let studentWallet;
            try {
                studentWallet = normalizeWalletAddress(student.walletAddress);
            } catch {
                skippedCount++;
                continue;
            }

            const hashData = normalizedEmail + event.date + event.name;
            const certificateHash = crypto
                .createHash('sha256')
                .update(hashData)
                .digest('hex');

            try {
                const { transactionHash, tokenId } = await mintNFT(
                    studentWallet,
                    certificateHash
                );

                const certificateId = `CERT-${nanoid(10)}`;

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
                        studentDepartment: student.department || 'N/A',
                        studentSemester: student.semester || 'N/A'
                    };

                    const pdfBuffer = await createPDFBuffer(certDataForPDF);
                    const ipfsResult = await ipfsService.uploadCertificate(
                        pdfBuffer,
                        certDataForPDF
                    );

                    if (ipfsResult) {
                        ipfsHash = ipfsResult.ipfsHash;
                        ipfsUrl = ipfsResult.ipfsUrl;
                    }
                } catch {}

                const newCert = new Certificate({
                    certificateId,
                    tokenId: tokenId.toString(),
                    certificateHash,
                    transactionHash,
                    studentName: participant.name,
                    studentEmail: normalizedEmail,
                    eventName: event.name,
                    eventDate: event.date,
                    issuedBy: issuerId,
                    verificationUrl: `/verify/${certificateId}`,
                    ipfsHash,
                    ipfsUrl
                });

                await newCert.save();

                sendCertificateIssued(
                    normalizedEmail,
                    participant.name,
                    event.name,
                    certificateId
                ).catch(() => {});

                issuedCount++;
            } catch (err) {
                errors.push(`Failed ${participant.name}: ${err.message}`);
                skippedCount++;
            }
        }

        event.certificatesIssued = true;
        await event.save();

        if (issuedCount > 0) {
            await logActivity(
                req.user,
                "BULK_ISSUE",
                `Issued ${issuedCount} NFTs for event: ${event.name}`
            );
        }

        res.status(201).json({
            message: `Successfully issued ${issuedCount} certificates. Skipped ${skippedCount}.`,
            issued: issuedCount,
            skipped: skippedCount,
            errors: errors.length ? errors : undefined
        });

    } catch (error) {
        res.status(500).json({
            message: 'Server error during bulk issuance',
            error: error.message
        });
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

        if (!certificate) {
            return res.status(404).json({ 
                message: 'Certificate not found or invalid.' 
            });
        }

        // Get event configuration for design
        const event = await Event.findOne({ name: certificate.eventName });
        const config = event?.certificateConfig || {};

        // Increment scan count
        certificate.scanCount += 1;
        await certificate.save();

        // Verify on blockchain
        const { exists, isRevoked } = await isHashValid(certificate.certificateHash);

        res.json({
            studentName: certificate.studentName,
            eventName: certificate.eventName,
            eventDate: certificate.eventDate,
            issuedBy: certificate.issuedBy?.name || 'System',
            issuedOn: certificate.createdAt,
            certificateHash: certificate.certificateHash,
            transactionHash: certificate.transactionHash,
            certificateId: certificate.certificateId,
            isBlockchainVerified: exists,
            isRevoked: isRevoked,
            scanCount: certificate.scanCount,
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
        console.error('Certificate verification error:', error);
        res.status(500).json({ 
            message: 'Server error during verification',
            error: error.message 
        });
    }
};

// --- GET MY CERTIFICATES ---
exports.getMyCertificates = async (req, res) => {
    try {
        const normalizedEmail = normalizeEmail(req.user.email);
        
        const certificates = await Certificate.find({ 
            studentEmail: normalizedEmail 
        })
        .populate('issuedBy', 'name')
        .sort({ eventDate: -1 });
        
        res.json(certificates);
        
    } catch (error) { 
        console.error('Get certificates error:', error);
        res.status(500).json({ 
            message: 'Server error fetching certificates',
            error: error.message 
        });
    }
};

// --- DOWNLOAD PDF ---
exports.downloadCertificate = async (req, res) => {
    try {
        const certificate = await Certificate.findOne({ 
            certificateId: req.params.certId 
        }).populate('issuedBy', 'name');
        
        if (!certificate) {
            return res.status(404).json({ message: 'Certificate not found' });
        }
        
        // If IPFS URL exists, redirect to it
        if (certificate.ipfsUrl) {
            return res.redirect(certificate.ipfsUrl);
        }

        // Otherwise generate PDF on the fly
        const event = await Event.findOne({ name: certificate.eventName });
        const studentUser = await User.findOne({ email: certificate.studentEmail });
        
        const certData = { 
            ...certificate.toObject(), 
            config: event?.certificateConfig || {}, 
            studentDepartment: studentUser?.department || 'N/A', 
            studentSemester: studentUser?.semester || 'N/A' 
        };
        
        await generateCertificatePDF(certData, res);
        
    } catch (error) { 
        console.error('Download certificate error:', error);
        res.status(500).json({ 
            message: 'Server error during download',
            error: error.message 
        });
    }
};

// --- REVOKE CERTIFICATE ---
exports.revokeCertificate = async (req, res) => {
    const { certificateId } = req.body;
    
    if (!certificateId) {
        return res.status(400).json({ message: 'Certificate ID is required' });
    }
    
    try {
        const certificate = await Certificate.findOne({ certificateId });
        
        if (!certificate) {
            return res.status(404).json({ message: 'Certificate not found.' });
        }

        // Revoke on blockchain
        await revokeByHash(certificate.certificateHash);
        
        // Log activity
        await logActivity(req.user, "CERTIFICATE_REVOKED", 
            `Revoked certificate ID: ${certificateId}`
        ).catch(err => console.error('Logging failed:', err.message));

        res.status(200).json({ 
            message: 'Certificate successfully revoked on the blockchain.',
            certificateId: certificateId
        });
        
    } catch (error) {
        console.error('Revocation failed:', error);
        res.status(500).json({ 
            message: 'Server error during revocation',
            error: error.message 
        });
    }
};