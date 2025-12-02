// In server/controllers/user.controller.js
const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const StudentRoster = require('../models/studentRoster.model');

// --- User Registration (Public) ---
exports.registerUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: 'User already exists' });

        // Default registration is usually Student or requires manual role setting
        user = new User({ name, email, password, role: role || 'Student' });
        
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// --- User Login ---
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });
        
        // Check verified status
        if (user.isVerified === false) {
             return res.status(403).json({ message: 'Please activate your account via email first.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const payload = {
            user: {
                id: user.id,
                role: user.role,
                name: user.name,
                email: user.email,
                department: user.department
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '3h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: payload.user });
            }
        );
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// --- Get User Profile ---
exports.getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// --- Admin: Add Student (Updated: Adds to Roster) ---
exports.addStudent = async (req, res) => {
    try {
        // 1. ADD 'semester' TO THE DESTRUCTURING
        const { name, email, department, usn, semester } = req.body; 

        const emailLower = email.toLowerCase();
        const usnLower = usn.toLowerCase();

        // 2. Check if user exists... (this logic is fine)
        let existingUser = await User.findOne({ $or: [{ email: emailLower }, { usn: usnLower }] });
        let existingRoster = await StudentRoster.findOne({ $or: [{ email: emailLower }, { usn: usnLower }] });
        
        if (existingUser) {
            return res.status(400).json({ message: 'Student is already registered and active.' });
        }
        if (existingRoster) {
            return res.status(400).json({ message: 'Student is already in the Waiting Room (Roster).' });
        }

        // 3. Add to Waiting Room (StudentRoster)
        const newRosterEntry = new StudentRoster({
            name,
            email: emailLower,
            // --- FIX: FORCE UPPERCASE ---
            usn: usn.toUpperCase(),
            department: department.toUpperCase(),
            // ----------------------------
            semester, // <-- 2. ADD IT HERE
            year: new Date().getFullYear() 
        });

        await newRosterEntry.save();

        res.status(201).json({ message: 'Student added to Roster. They can now activate their account.' });

    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};
// --- Admin: Get All Students ---
exports.getAllStudents = async (req, res) => {
    try {
        // If SuperAdmin, show all. If Faculty, show only their department.
        const query = { role: 'Student' };
        
        if (req.user.role === 'Faculty') {
            query.department = req.user.department;
        }

        const students = await User.find(query).select('-password');
        res.json(students);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// --- Admin: Delete Student (RESTORED) ---
exports.deleteStudent = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findByIdAndDelete(userId);

        if (!user) {
            return res.status(404).json({ message: 'Student not found' });
        }

        res.json({ message: 'Student deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};


// In server/controllers/user.controller.js




// In server/controllers/user.controller.js
// ... (keep all your other exports: loginUser, addStudent, etc.) ...

// --- Save Wallet Address ---
exports.saveWalletAddress = async (req, res) => {
    const { walletAddress } = req.body;
    const userId = req.user.id; // From authMiddleware

    if (!walletAddress) {
        return res.status(400).json({ message: 'Wallet address is required.' });
    }
    // --- FIX: Force Lowercase ---
    const normalizedWallet = walletAddress.toLowerCase();

    try {
        // Check if another user already claimed this wallet
       const existing = await User.findOne({ walletAddress: normalizedWallet });
        if (existing && existing._id.toString() !== userId) {
            return res.status(400).json({ message: 'This wallet is already linked to another account.' });
        }
        
        // Find user and update
        const user = await User.findById(userId);
        user.walletAddress = normalizedWallet;
        await user.save();
        
        res.status(200).json({ 
            message: 'Wallet saved!', 
            walletAddress: user.walletAddress 
        });
        
    } catch (error) {
        console.error(error); // Log the error on the server
        res.status(500).json({ message: 'Server error saving wallet.' });
    }
};


// In server/controllers/user.controller.js

// --- Admin: Get All Faculty ---
exports.getAllFaculty = async (req, res) => {
    try {
        const faculty = await User.find({ role: 'Faculty' }).select('-password');
        res.json(faculty);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};