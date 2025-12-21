// In server/controllers/auth.controller.js
const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const StudentRoster = require('../models/studentRoster.model'); 
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { SiweMessage, generateNonce } = require('siwe'); 
const { getAddress } = require('ethers/address');
const { sendStudentActivation, sendPasswordReset } = require('../utils/mailer'); 

// Helper function to handle USN normalization for consistency
const normalizeUSN = (usn) => (usn ? usn.toUpperCase() : null);
const normalizeDept = (dept) => (dept ? dept.toUpperCase() : 'GENERAL');


// --- 1. FACULTY INVITE: Claim Account ---
exports.claimFacultyInvite = async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
        return res.status(400).json({ message: 'Missing token or password.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { name, email, department, role } = decoded;

        let existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'This account has already been claimed.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role, 
            department,
            isVerified: true
        });

        await newUser.save();

        const payload = {
            user: {
                id: newUser.id,
                role: newUser.role,
                name: newUser.name,
                email: newUser.email,
                department: newUser.department
            }
        };

        const authToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '3h' });

        res.status(201).json({
            message: 'Account created successfully!',
            token: authToken,
            user: payload.user
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(400).json({ message: 'Invalid or expired invite link.' });
        }
        console.error('Error claiming invite:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};


// --- 2. SIWE STEP 1: Get Nonce ---
exports.getNonce = async (req, res) => {
    try {
        const { address } = req.query; 
        if (!address) {
            return res.status(400).json({ message: 'Wallet address is required.' });
        }

        const normalizedAddress = getAddress(address.toLowerCase());

        let user = await User.findOne({ walletAddress: normalizedAddress });
        if (!user) {
            return res.status(404).json({ message: 'This wallet is not registered. Please activate your account first.' });
        }

        user.nonce = generateNonce();
        await user.save();
        
        res.status(200).json({ nonce: user.nonce });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// --- 3. SIWE STEP 2: Verify Signature & Login ---
exports.verifySignature = async (req, res) => {
    try {
        const { message, signature } = req.body;
        
        const siweMessage = new SiweMessage(message);
        const fields = await siweMessage.verify({ signature });

        const normalizedAddress = getAddress(fields.data.address.toLowerCase());
        const user = await User.findOne({ walletAddress: normalizedAddress });
        
        if (!user) {
            return res.status(401).json({ message: 'Invalid signature or user.' });
        }
        
        if (fields.data.nonce !== user.nonce) {
            return res.status(401).json({ message: 'Invalid nonce. Please try again.' });
        }

        user.nonce = generateNonce();
        await user.save();

        const payload = {
            user: {
                id: user.id,
                role: user.role,
                name: user.name,
                email: user.email,
                department: user.department,
                walletAddress: user.walletAddress,
                usn: user.usn 
            }
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '3h' });

        res.status(200).json({ token, user: payload.user });

    } catch (error) {
        console.error("SIWE Error:", error);
        res.status(500).json({ message: error.error?.type || 'Signature verification failed.' });
    }
};


// --- 4. REQUEST STUDENT ACTIVATION (The Failed Route) ---
exports.requestStudentActivation = async (req, res) => {
    const { usn, email } = req.body;

    if (!usn || !email) {
        return res.status(400).json({ message: 'USN and Email are required.' });
    }

    const normalizedEmail = email.toLowerCase();
    const normalizedUsn = normalizeUSN(usn); // Now defined

    try {
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({ message: 'This account is already active. Please go to Login.' });
        }

        const rosterEntry = await StudentRoster.findOne({ 
            email: normalizedEmail, 
            usn: normalizedUsn 
        });

        if (!rosterEntry) {
            return res.status(404).json({ message: 'Your USN and Email do not match the college roster.' });
        }

        const activationToken = jwt.sign(
            { rosterId: rosterEntry._id, email: rosterEntry.email, role: 'Student' },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // --- EMAIL FAILSAFE LOGIC ---
        let emailStatus = "Sent";
        try {
            await sendStudentActivation(rosterEntry.email, activationToken);
            console.log("Email sent successfully via Nodemailer.");
        } catch (emailError) {
            console.error("EMAIL FAILED (Recoverable):", emailError.message);
            emailStatus = "Failed";
        }

        const debugLink = "https://the-blockchain-based-skill-credenti.vercel.app/activate-account/" + activationToken;

        res.status(200).json({ 
            message: `Activation process started! (Email status: ${emailStatus})`, 
            debugLink: debugLink
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};


// --- 5. ACTIVATE STUDENT ACCOUNT ---
exports.activateStudentAccount = async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
        return res.status(400).json({ message: 'Missing token or password.' });
    }
    if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(400).json({ message: 'This activation link has expired. Please request a new one.' });
        }
        return res.status(400).json({ message: 'Invalid activation link.' });
    }

    try {
        const rosterEntry = await StudentRoster.findById(decoded.rosterId);

        if (!rosterEntry) {
            return res.status(400).json({ message: 'This account has already been activated or the invite is invalid.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            name: rosterEntry.name,
            email: rosterEntry.email,
            usn: normalizeUSN(rosterEntry.usn), 
            department: normalizeDept(rosterEntry.department),
            semester: rosterEntry.semester,
            password: hashedPassword,
            role: 'Student',
            isVerified: true
        });

        await newUser.save();

        await StudentRoster.findByIdAndDelete(rosterEntry._id);

        const payload = {
            user: {
                id: newUser.id,
                role: newUser.role,
                name: newUser.name,
                email: newUser.email,
                department: newUser.department
            }
        };
        const authToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '3h' });

        res.status(201).json({
            message: 'Account activated successfully!',
            token: authToken,
            user: payload.user
        });

    } catch (error) {
        console.error('Error activating account:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'An account with this USN or Email already exists.' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
};


// --- 6. REQUEST PASSWORD RESET ---
exports.requestPasswordReset = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(200).json({ message: 'If an account exists with this email, a reset link has been sent.' });
        }

        const resetToken = jwt.sign(
            { id: user._id, type: 'reset' }, 
            process.env.JWT_SECRET, 
            { expiresIn: '15m' }
        );

        await sendPasswordReset(user.email, resetToken);
        
        res.status(200).json({ message: 'If an account exists with this email, a reset link has been sent.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
};

// --- 7. PERFORM PASSWORD RESET ---
exports.resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;
    
    if (newPassword.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.type !== 'reset') {
            return res.status(400).json({ message: 'Invalid token type.' });
        }

        const user = await User.findById(decoded.id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.status(200).json({ message: 'Password reset successful! You can now login.' });

    } catch (error) {
        return res.status(400).json({ message: 'Invalid or expired token.' });
    }
};

module.exports = router;