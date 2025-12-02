// In server/index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// --- IMPORT ROUTE FILES ---
const userRoutes = require('./routes/user.routes');
const eventRoutes = require('./routes/event.routes');
const certificateRoutes = require('./routes/certificate.routes');
const adminRoutes = require('./routes/admin.routes');
const authRoutes = require('./routes/auth.routes');
const verifierRoutes = require('./routes/verifier.routes');
const quizRoutes = require('./routes/quiz.routes');
const recommendationRoutes = require('./routes/recommendation.routes');
const poapRoutes = require('./routes/poap.routes');

const app = express();
// CRITICAL: Use process.env.PORT or default to 10000 (Render's default)
const PORT = process.env.PORT || 10000; 

// --- MIDDLEWARE ---
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ALLOW ALL CORS (For debugging deployment)
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// --- DATABASE CONNECTION ---
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB connected successfully.');
    } catch (err) {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1); // Exit if DB fails
    }
};
connectDB();

// --- TEST ROUTE ---
app.get('/', (req, res) => {
    res.status(200).send('CredentialChain API is Running!');
});

// --- REGISTER ROUTES ---
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/verifier', verifierRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/poap', poapRoutes);

// --- START SERVER ---
app.listen(PORT, '0.0.0.0', () => { // Bind to 0.0.0.0 for Render
    console.log(`🚀 Server is running on port ${PORT}`);
});