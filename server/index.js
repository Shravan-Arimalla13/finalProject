// In server/index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// --- IMPORT ROUTE FILES ---
const userRoutes = require('./routes/user.routes');
const eventRoutes = require('./routes/event.routes');
const certificateRoutes = require('./routes/certificate.routes');
const certificateRoutes = require('./routes/certificateRoutes');
const adminRoutes = require('./routes/admin.routes');
const authRoutes = require('./routes/auth.routes');
const verifierRoutes = require('./routes/verifier.routes');
const quizRoutes = require('./routes/quiz.routes');
const poapRoutes = require('./routes/poap.routes'); 
const recommendationRoutes = require('./routes/recommendation.routes');

const app = express();
const PORT = process.env.PORT || 10000; 

// --- CORS CONFIGURATION (FIX) ---
// Render needs to know to allow requests from your Vercel frontend domain.
const allowedOrigins = [
    'http://localhost:5173', // For local development testing
    'https://final-project-wheat-mu-84.vercel.app', // Your Vercel domain 
    // Add your other Vercel domain if you use both (the-blockchain-based...)
    'https://the-blockchain-based-skill-credenti.vercel.app'
];

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or local files)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true // Allow cookies/sessions to be sent (though we use JWT)
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
console.log('Auth Router:', typeof authRoutes);
console.log('Cert Router:', typeof certificateRoutes);
console.log('AI Router:', typeof aiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/verifier', verifierRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/poap', poapRoutes); // <--- THIS MUST BE HERE

// --- START SERVER ---
app.listen(PORT, '0.0.0.0', () => { // Bind to 0.0.0.0 for Render
    console.log(`🚀 Server is running on port ${PORT}`);
});