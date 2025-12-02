// In server/seedAdmin.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/user.model'); // Adjust path if needed
require('dotenv').config();

const createSuperAdmin = async () => {
    // 1. Get admin details from .env file
    const name = "Super Admin";
    const email = process.env.SEED_ADMIN_EMAIL;
    const password = process.env.SEED_ADMIN_PASSWORD;

    if (!email || !password) {
        console.error("Please set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in your .env file.");
        return;
    }

    // 2. Connect to MongoDB
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB connected for seeding...");

        // 3. Check if admin already exists
        const existingAdmin = await User.findOne({ email });
        if (existingAdmin) {
            console.log("SuperAdmin already exists.");
            return;
        }

        // 4. Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 5. Create the new SuperAdmin user
        const admin = new User({
            name: name,
            email: email.toLowerCase(),
            password: hashedPassword,
            role: 'SuperAdmin',
            department: 'Administration', // Default department for the super admin
            isVerified: true // The SuperAdmin is verified by default
        });

        await admin.save();
        console.log("✅ SuperAdmin created successfully!");
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${password}`);

    } catch (error) {
        console.error("Error during admin seeding:", error);
    } finally {
        // 6. Disconnect from DB
        await mongoose.disconnect();
        console.log("MongoDB disconnected.");
    }
};

createSuperAdmin();