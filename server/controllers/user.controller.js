// server/controllers/user.controller.js - COMPLETE FIXED VERSION
const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const StudentRoster = require('../models/studentRoster.model');
const { getAddress } = require('ethers/address');

// Helper function to normalize USN
const normalizeUSN = (usn) => {
    if (!usn || typeof usn !== 'string') return null;
    return usn.toUpperCase().trim();
};

// Helper function to normalize department
const normalizeDept = (dept) => {
    if (!dept || typeof dept !== 'string') return 'GENERAL';
    return dept.toUpperCase().trim();
};

// Helper function to normalize email
const normalizeEmail = (email) => {
    if (!email || typeof email !== 'string') return null;
    return email.toLowerCase().trim();
};

// Helper function to validate and normalize wallet address
const normalizeWalletAddress = (address) => {
    if (!address || typeof address !== 'string') return null;
    try {
        return getAddress(address.toLowerCase());
    } catch (error) {
        throw new Error('Invalid Ethereum address format');
    }
};

// --- User Registration (Public) ---
exports.registerUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        
        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({ 
                message: 'Name, email, and password are required' 
            });
        }

        const normalizedEmail = normalizeEmail(email);
        
        // Check if user exists
        let user = await User.findOne({ email: normalizedEmail });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        user = new User({ 
            name, 
            email: normalizedEmail, 
            password: hashedPassword, 
            role: role || 'Student',
            department: 'GENERAL'
        });

        await user.save();
        
        res.status(201).json({ 
            message: 'User registered successfully',
            userId: user._id,
            email: user.email
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            message: 'Server error during registration',
            error: error.message 
        });
    }
};

// --- User Login ---
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ 
                message: 'Email and password are required' 
            });
        }

        const normalizedEmail = normalizeEmail(email);
        
        // Find user
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        // Check if account is verified
        if (user.isVerified === false) {
            return res.status(403).json({ 
                message: 'Please activate your account via email first.' 
            });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Prepare payload
        const payload = {
            user: {
                id: user.id,
                role: user.role,
                name: user.name,
                email: user.email,
                department: user.department,
                walletAddress: user.walletAddress 
                    ? normalizeWalletAddress(user.walletAddress) 
                    : null,
                usn: user.usn
            }
        };

        // Generate JWT
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '3h' },
            (err, token) => {
                if (err) {
                    console.error('JWT signing error:', err);
                    return res.status(500).json({ 
                        message: 'Error generating token' 
                    });
                }
                
                res.json({ 
                    token, 
                    user: payload.user 
                });
            }
        );
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            message: 'Server error during login',
            error: error.message 
        });
    }
};

// --- Get User Profile ---
exports.getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json(user);
        
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ 
            message: 'Server error fetching profile',
            error: error.message 
        });
    }
};

// --- Admin: Add Student (To Roster) ---
exports.addStudent = async (req, res) => {
    try {
        const { name, email, department, usn, semester } = req.body;

        // Validate required fields
        if (!name || !email || !department || !usn) {
            return res.status(400).json({ 
                message: 'Name, email, department, and USN are required' 
            });
        }

        const emailLower = normalizeEmail(email);
        const usnUpper = normalizeUSN(usn);
        const deptUpper = normalizeDept(department);

        if (!emailLower || !usnUpper) {
            return res.status(400).json({ 
                message: 'Invalid email or USN format' 
            });
        }

        // Check if user already exists
        let existingUser = await User.findOne({ 
            $or: [{ email: emailLower }, { usn: usnUpper }] 
        });
        
        if (existingUser) {
            return res.status(400).json({ 
                message: 'Student is already registered and active.' 
            });
        }
        
        // Check if already in roster
        let existingRoster = await StudentRoster.findOne({ 
            $or: [{ email: emailLower }, { usn: usnUpper }] 
        });
        
        if (existingRoster) {
            return res.status(400).json({ 
                message: 'Student is already in the Waiting Room (Roster).' 
            });
        }

        // Add to Waiting Room (StudentRoster)
        const newRosterEntry = new StudentRoster({
            name: name.trim(),
            email: emailLower,
            usn: usnUpper,
            department: deptUpper,
            semester: semester || '1st', 
            year: new Date().getFullYear() 
        });

        await newRosterEntry.save();

        res.status(201).json({ 
            message: 'Student added to Roster. They can now activate their account.',
            student: {
                name: newRosterEntry.name,
                email: newRosterEntry.email,
                usn: newRosterEntry.usn,
                department: newRosterEntry.department
            }
        });

    } catch (error) {
        console.error('Add Student Error:', error);
        
        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({ 
                message: 'A student with this email or USN already exists.' 
            });
        }
        
        res.status(500).json({ 
            message: 'Server error adding student',
            error: error.message 
        });
    }
};

// --- Admin: Get All Students ---
exports.getAllStudents = async (req, res) => {
    try {
        const query = { role: 'Student' };
        
        // Faculty can only see students from their department
        if (req.user.role === 'Faculty') {
            query.department = req.user.department;
        }

        const students = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 });
        
        res.json(students);
        
    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({ 
            message: 'Server error fetching students',
            error: error.message 
        });
    }
};

// --- Admin: Delete Student ---
exports.deleteStudent = async (req, res) => {
    try {
        const userId = req.params.id;
        
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        const user = await User.findByIdAndDelete(userId);

        if (!user) {
            return res.status(404).json({ message: 'Student not found' });
        }

        res.json({ 
            message: 'Student deleted successfully',
            deletedUser: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
        
    } catch (error) {
        console.error('Delete student error:', error);
        res.status(500).json({ 
            message: 'Server error deleting student',
            error: error.message 
        });
    }
};

// --- Save Wallet Address ---
exports.saveWalletAddress = async (req, res) => {
    const { walletAddress } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!walletAddress) {
        return res.status(400).json({ message: 'Wallet address is required.' });
    }
    
    try {
        // Normalize and validate wallet address
        let normalizedWallet;
        try {
            normalizedWallet = normalizeWalletAddress(walletAddress);
        } catch (error) {
            return res.status(400).json({ 
                message: 'Invalid Ethereum address format.',
                details: error.message 
            });
        }
        
        // Check if wallet is already claimed by another user
        const existing = await User.findOne({ 
            walletAddress: normalizedWallet,
            _id: { $ne: userId } // Exclude current user
        });
        
        if (existing) {
            return res.status(400).json({ 
                message: 'This wallet is already linked to another account.' 
            });
        }
        
        // Find user and update
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        user.walletAddress = normalizedWallet;
        await user.save();
        
        res.status(200).json({ 
            message: 'Wallet saved successfully!', 
            walletAddress: user.walletAddress 
        });
        
    } catch (error) {
        console.error('Save wallet error:', error); 
        res.status(500).json({ 
            message: 'Server error saving wallet.',
            error: error.message 
        });
    }
};

// --- Admin: Get All Faculty ---
exports.getAllFaculty = async (req, res) => {
    try {
        const faculty = await User.find({ role: 'Faculty' })
            .select('-password')
            .sort({ createdAt: -1 });
        
        res.json(faculty);
        
    } catch (error) {
        console.error('Get faculty error:', error);
        res.status(500).json({ 
            message: 'Server error fetching faculty',
            error: error.message 
        });
    }
};