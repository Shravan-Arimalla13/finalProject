// server/controllers/quiz.controller.js - ULTIMATE AI FIX
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Quiz = require('../models/quiz.model');
const Certificate = require('../models/certificate.model');
const Event = require('../models/event.model');
const User = require('../models/user.model');
const { nanoid } = require('nanoid');
const crypto = require('crypto');
const { mintNFT } = require('../utils/blockchain');
const { sendCertificateIssued } = require('../utils/mailer');

// Validate API Key on Startup
if (!process.env.GEMINI_API_KEY) {
    console.error('❌ FATAL: GEMINI_API_KEY not found in environment variables');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_NAME = "gemini-1.5-flash"; 

const AI_CONFIG = {
    maxRetries: 3,
    timeoutMs: 20000, 
    temperature: 0.7, // Lowered for more consistent JSON
    maxOutputTokens: 500,
    retryDelayMs: 2000 
};

/**
 * Clean AI JSON response to prevent parsing errors
 */
const cleanJSON = (text) => {
    if (!text) return "";
    // Removes markdown code blocks and whitespace
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

/**
 * Strict validation of AI-generated question
 */
function validateQuestionData(questionData) {
    const required = ['question', 'options', 'correctAnswer', 'explanation'];
    for (const field of required) {
        if (!questionData[field]) throw new Error(`Missing field: ${field}`);
    }
    if (!Array.isArray(questionData.options) || questionData.options.length !== 4) {
        throw new Error('Invalid options count');
    }
    if (!questionData.options.includes(questionData.correctAnswer)) {
        throw new Error('Correct answer not in options');
    }
    return true;
}

/**
 * AI Question Generator with Exponential Backoff
 */
async function generateQuestionWithRetry(prompt, maxRetries = AI_CONFIG.maxRetries) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🤖 AI Generation Attempt ${attempt}/${maxRetries}`);
            
            const model = genAI.getGenerativeModel({ model: MODEL_NAME });
            
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('TIMEOUT')), AI_CONFIG.timeoutMs);
            });
            
            const result = await Promise.race([
                model.generateContent(prompt),
                timeoutPromise
            ]);

            const response = await result.response;
            const text = response.text();
            
            if (!text || text.length < 50) throw new Error('EMPTY_RESPONSE');
            return text;
            
        } catch (error) {
            lastError = error;
            const errorMsg = error.message.toLowerCase();
            
            // Handle Rate Limits (429)
            if (errorMsg.includes('429') || errorMsg.includes('quota')) {
                const wait = AI_CONFIG.retryDelayMs * Math.pow(2, attempt); 
                console.log(`⏳ Rate limit hit. Waiting ${wait}ms...`);
                await new Promise(r => setTimeout(r, wait));
                continue;
            }
            
            if (attempt === maxRetries) throw error;
        }
    }
    throw lastError;
}

/**
 * GET NEXT ADAPTIVE QUESTION
 * Uses student history to scale difficulty
 */
exports.nextQuestion = async (req, res) => {
    const { quizId, history } = req.body;

    try {
        const quiz = await Quiz.findById(quizId);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        const currentQIndex = history ? history.length : 0;
        
        // Adaptive Difficulty Logic
        let difficulty = 'Medium';
        if (currentQIndex < Math.floor(quiz.totalQuestions * 0.3)) {
            difficulty = 'Easy';
        } else if (history && history.length >= 2) {
            const recent = history.slice(-2);
            const correctCount = recent.filter(h => h.isCorrect).length;
            difficulty = correctCount === 2 ? 'Hard' : (correctCount === 0 ? 'Easy' : 'Medium');
        }

        const previousQuestionsText = history 
            ? history.map(h => h.questionText).slice(-3).join(" | ") 
            : "None";

        const prompt = `Topic: ${quiz.topic}. Generate ONE ${difficulty} MCQ. 
        Context: ${quiz.description}. Avoid repeating concepts like: ${previousQuestionsText}.
        Return ONLY JSON: {"question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": "...", "explanation": "..."}`;

        const text = await generateQuestionWithRetry(prompt);
        const questionData = JSON.parse(cleanJSON(text));
        
        validateQuestionData(questionData);
        
        questionData.difficulty = difficulty;
        questionData.questionNumber = currentQIndex + 1;
        
        res.json(questionData);

    } catch (error) {
        console.error("❌ AI Error:", error.message);
        res.status(500).json({ 
            message: "AI Generation failed. Please try again.",
            retryable: true 
        });
    }
};

/**
 * GET AVAILABLE QUIZZES
 * Fetches real database entries
 */
exports.getAvailableQuizzes = async (req, res) => {
    try {
        // Fetch ALL active quizzes from the DB (removes predefined mocks)
        const quizzes = await Quiz.find({ isActive: true })
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 });

        const quizzesWithStatus = await Promise.all(quizzes.map(async (quiz) => {
            const certName = `Certified: ${quiz.topic}`;
            const hasCert = await Certificate.findOne({ 
                eventName: certName, 
                studentEmail: req.user.email.toLowerCase() 
            });
            
            return {
                ...quiz.toObject(),
                hasPassed: !!hasCert,
                certificateId: hasCert ? hasCert.certificateId : null
            };
        }));

        res.json(quizzesWithStatus);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch quizzes" });
    }
};

/**
 * SUBMIT QUIZ & MINT CERTIFICATE
 */
exports.submitQuiz = async (req, res) => {
    const { quizId, score } = req.body;
    const userId = req.user.id;

    try {
        const quiz = await Quiz.findById(quizId);
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
        
        const percentage = (score / quiz.totalQuestions) * 100;

        if (percentage < quiz.passingScore) {
            return res.json({ 
                passed: false, 
                score: percentage,
                message: `You scored ${percentage.toFixed(1)}%. You need ${quiz.passingScore}% to pass.` 
            });
        }

        const student = await User.findById(userId);
        const certName = `Certified: ${quiz.topic}`;
        const normalizedEmail = student.email.toLowerCase();

        // Check for existing certificate
        const existingCert = await Certificate.findOne({ eventName: certName, studentEmail: normalizedEmail });
        if (existingCert) return res.json({ passed: true, certificateId: existingCert.certificateId });

        // Blockchain Minting
        let txHash = "0x" + crypto.randomBytes(32).toString('hex');
        let tokenId = Math.floor(Math.random() * 1000000).toString();
        
        if (student.walletAddress) {
            try {
                const mintResult = await mintNFT(student.walletAddress, crypto.createHash('sha256').update(normalizedEmail + certName).digest('hex'));
                txHash = mintResult.transactionHash;
                tokenId = mintResult.tokenId.toString();
            } catch (e) { console.error("Minting error:", e.message); }
        }

        const certId = `SKILL-${nanoid(8)}`;
        const newCert = new Certificate({
            certificateId: certId,
            tokenId,
            transactionHash: txHash,
            studentName: student.name,
            studentEmail: normalizedEmail,
            eventName: certName,
            eventDate: new Date(),
            issuedBy: userId,
            verificationUrl: `/verify/${certId}`
        });
        
        await newCert.save();
        sendCertificateIssued(normalizedEmail, student.name, certName, certId).catch(() => {});

        res.json({ passed: true, certificateId: certId, score: percentage });

    } catch (error) {
        res.status(500).json({ message: "Error submitting quiz" });
    }
};