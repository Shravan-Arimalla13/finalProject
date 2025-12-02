// In server/controllers/auth.controller.js
const User = require('../models/user.model');
const StudentRoster = require('../models/studentRoster.model'); 
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sendStudentActivation } = require('../utils/mailer');
const { SiweMessage, generateNonce } = require('siwe');
const { sendPasswordReset } = require('../utils/mailer');

exports.claimFacultyInvite = async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
        return res.status(400).json({ message: 'Missing token or password.' });
    }

    try {
        // 1. Verify the invite token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 2. Extract user data from the (now trusted) token
        const { name, email, department, role } = decoded;

        // 3. Check if user *already* exists (paranoia is good security)
        let existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'This account has already been claimed.' });
        }

        // 4. Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 5. Create the new user
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role, // 'Faculty'
            department,
            isVerified: true // They are verified because they came from a trusted email link
        });

        await newUser.save();

        // 6. Log them in immediately by issuing a *new* auth token
        const payload = {
            user: {
                id: newUser.id,
                role: newUser.role,
                name: newUser.name,
                email: newUser.email,
                department: newUser.department // Don't forget this!
            }
        };

        const authToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '3h' });

        res.status(201).json({
            message: 'Account created successfully!',
            token: authToken,
            user: payload.user
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(400).json({ message: 'Invalid or malformed invite link.' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(400).json({ message: 'This invite link has expired. Please ask your administrator for a new one.' });
        }
        console.error('Error claiming invite:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// --- MODIFIED FUNCTION: Request Student Activation (With Debug Failsafe) ---
exports.requestStudentActivation = async (req, res) => {
    const { usn, email } = req.body;

    if (!usn || !email) {
        return res.status(400).json({ message: 'USN and Email are required.' });
    }

    const normalizedEmail = email.toLowerCase();
    const normalizedUsn = usn.toLowerCase();

    try {
        // 1. Check if they are already a fully registered user
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({ message: 'This account is already active. Please go to Login.' });
        }

        // 2. Check the roster
        const rosterEntry = await StudentRoster.findOne({ 
            email: normalizedEmail, 
            usn: normalizedUsn 
        });

        if (!rosterEntry) {
            return res.status(404).json({ message: 'Your USN and Email do not match the college roster. Please contact your administrator.' });
        }

        // 3. Create the activation token
        const activationToken = jwt.sign(
            { 
                rosterId: rosterEntry._id,
                email: rosterEntry.email,
                role: 'Student' 
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // 4. Attempt to send Email (but don't crash if it fails)
        let emailStatus = "Sent";
        try {
            await sendStudentActivation(rosterEntry.email, activationToken);
            console.log("Email sent successfully via Nodemailer.");
        } catch (emailError) {
            console.error("EMAIL FAILED (Recoverable):", emailError.message);
            emailStatus = "Failed";
        }

        // --- THE FAILSAFE ---
        // We return the link in the response so you can debug/demo it even if email fails.
        // In a real production app, you might remove 'debugLink' for security, 
        // but for a demo/evaluation, this is a life-saver.
        const debugLink = `https://final-project-wheat-mu-84.vercel.app/activate-account/${activationToken}`;
        
        res.status(200).json({ 
            message: `Activation process started! (Email status: ${emailStatus})`, 
            debugLink: debugLink // <--- Look for this in your Browser Console
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// --- NEW FUNCTION: The final step of student activation ---
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
        // 1. Verify the activation token
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        // Handle expired or invalid tokens
        if (error.name === 'TokenExpiredError') {
            return res.status(400).json({ message: 'This activation link has expired. Please request a new one.' });
        }
        return res.status(400).json({ message: 'Invalid activation link.' });
    }

    try {
        // 2. Find the student in the temporary roster
        const rosterEntry = await StudentRoster.findById(decoded.rosterId);

        if (!rosterEntry) {
            return res.status(400).json({ message: 'This account has already been activated or the invite is invalid.' });
        }

        // 3. Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Create the *real* user in the main 'users' collection
        const newUser = new User({
            name: rosterEntry.name,
            email: rosterEntry.email,
            // --- FIX: FORCE UPPERCASE ---
                usn: rosterEntry.usn.toUpperCase(), 
                department: rosterEntry.department.toUpperCase(),
                // ----------------------------
            semester: rosterEntry.semester,
            password: hashedPassword,
            role: 'Student',
            isVerified: true // They are now verified!
        });

        await newUser.save();

        // 5. CRITICAL: Delete them from the temporary roster
        await StudentRoster.findByIdAndDelete(rosterEntry._id);

        // 6. Log them in by issuing a new auth token
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
        // This catches database errors, e.g., if USN is somehow duplicated
        console.error('Error activating account:', error);
        if (error.code === 11000) {
             return res.status(400).json({ message: 'An account with this USN or Email already exists.' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
};

// --- SIWE STEP 1: Get Nonce ---
exports.getNonce = async (req, res) => {
    try {
        const { address } = req.query;
        if (!address) {
            return res.status(400).json({ message: 'Wallet address is required.' });
        }

        const normalizedAddress = address.toLowerCase();

        // Find the user by their wallet
        let user = await User.findOne({ walletAddress: normalizedAddress });
        if (!user) {
            return res.status(404).json({ message: 'This wallet is not registered. Please activate your account first.' });
        }

        // --- THE FIX IS HERE ---
        // Use the library to generate a valid, 17-char alphanumeric nonce
        user.nonce = generateNonce(); 
        await user.save();
        
        res.status(200).json({ nonce: user.nonce });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// --- SIWE STEP 2: Verify Signature ---
exports.verifySignature = async (req, res) => {
    try {
        const { message, signature } = req.body;
        
        const siweMessage = new SiweMessage(message);
        const fields = await siweMessage.verify({ signature });

        const normalizedAddress = fields.data.address.toLowerCase();
        const user = await User.findOne({ walletAddress: normalizedAddress });
        
        if (!user) {
            return res.status(401).json({ message: 'Invalid signature or user.' });
        }
        
        if (fields.data.nonce !== user.nonce) {
            return res.status(401).json({ message: 'Invalid nonce. Please try again.' });
        }

        user.nonce = generateNonce(); 
        await user.save();

        // --- THIS IS THE FIX ---
        // We must include 'walletAddress' in the payload so the frontend sees it immediately
        const payload = {
            user: {
                id: user.id,
                role: user.role,
                name: user.name,
                email: user.email,
                department: user.department,
                walletAddress: user.walletAddress // <--- MAKE SURE THIS LINE IS HERE
            }
        };
        // -----------------------

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '3h' });

        res.status(200).json({ token, user: payload.user });

    } catch (error) {
        console.error("SIWE Error:", error);
        res.status(500).json({ message: error.error?.type || 'Signature verification failed.' });
    }
};

// --- 1. REQUEST PASSWORD RESET ---
exports.requestPasswordReset = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            // Security Best Practice: Don't reveal if user exists or not.
            // Always say "If that email exists, we sent a link."
            return res.status(200).json({ message: 'If an account exists with this email, a reset link has been sent.' });
        }

        // Generate a short-lived token (15 mins)
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

// --- 2. PERFORM PASSWORD RESET ---
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

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.status(200).json({ message: 'Password reset successful! You can now login.' });

    } catch (error) {
        return res.status(400).json({ message: 'Invalid or expired token.' });
    }
};