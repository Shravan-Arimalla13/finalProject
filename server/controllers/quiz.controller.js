const { GoogleGenerativeAI } = require("@google/generative-ai");
const Quiz = require('../models/quiz.model');
const Certificate = require('../models/certificate.model');
const User = require('../models/user.model');
const { nanoid } = require('nanoid');
const crypto = require('crypto');
const { mintNFT } = require('../utils/blockchain');
const { sendCertificateIssued } = require('../utils/mailer');

// Validate API Key
if (!process.env.GEMINI_API_KEY) {
    console.error('❌ FATAL: GEMINI_API_KEY missing');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_NAME = "gemini-1.5-flash"; 

const AI_CONFIG = {
    maxRetries: 3,
    timeoutMs: 20000, 
    temperature: 0.7,
    maxOutputTokens: 500,
    retryDelayMs: 2000 
};

const cleanJSON = (text) => {
    if (!text) return "";
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

function validateQuestionData(questionData) {
    const required = ['question', 'options', 'correctAnswer', 'explanation'];
    for (const field of required) {
        if (!questionData[field]) throw new Error(`Missing field: ${field}`);
    }
    if (!Array.isArray(questionData.options) || questionData.options.length !== 4) throw new Error('Invalid options count');
    if (!questionData.options.includes(questionData.correctAnswer)) throw new Error('Answer not in options');
    return true;
}

async function generateQuestionWithRetry(prompt, maxRetries = AI_CONFIG.maxRetries) {
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const model = genAI.getGenerativeModel({ model: MODEL_NAME });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            if (!text || text.length < 50) throw new Error('EMPTY_RESPONSE');
            return text;
        } catch (error) {
            lastError = error;
            if (error.message.includes('429')) {
                await new Promise(r => setTimeout(r, AI_CONFIG.retryDelayMs * attempt));
                continue;
            }
            if (attempt === maxRetries) throw error;
        }
    }
    throw lastError;
}

// --- EXPORTED FUNCTIONS ---

exports.getQuizDetails = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.quizId);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        const certName = `Certified: ${quiz.topic}`;
        const hasPassed = await Certificate.findOne({ 
            eventName: certName, 
            studentEmail: req.user.email.toLowerCase() 
        });

        res.json({
            topic: quiz.topic,
            description: quiz.description,
            totalQuestions: quiz.totalQuestions,
            passingScore: quiz.passingScore,
            hasPassed: !!hasPassed,
            certificateId: hasPassed?.certificateId
        });
    } catch (error) { res.status(500).json({ message: "Server Error" }); }
};

exports.nextQuestion = async (req, res) => {
    const { quizId, history } = req.body;
    try {
        const quiz = await Quiz.findById(quizId);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        let difficulty = 'Medium';
        const currentIdx = history ? history.length : 0;
        if (currentIdx < 3) difficulty = 'Easy';
        else if (history.slice(-2).every(h => h.isCorrect)) difficulty = 'Hard';

        const prevConcepts = history ? history.map(h => h.questionText).slice(-5).join(" | ") : "None";

        const prompt = `
        SYSTEM: You are a strict academic professor.
        SUBJECT: ${quiz.topic}
        CONTEXT: ${quiz.description}
        DIFFICULTY: ${difficulty}

        TASK: Generate ONE MCQ strictly about ${quiz.topic}.
        - NEVER mention JavaScript, Closures, or Web Dev unless the topic is exactly that.
        - Avoid repeating: ${prevConcepts}.
        
        OUTPUT JSON:
        {"question": "...", "options": ["...", "...", "...", "..."], "correctAnswer": "...", "explanation": "..."}`;

        const text = await generateQuestionWithRetry(prompt);
        const questionData = JSON.parse(cleanJSON(text));
        validateQuestionData(questionData);

        res.json({ ...questionData, difficulty, questionNumber: currentIdx + 1 });
    } catch (error) { res.status(500).json({ message: "AI Generation failed" }); }
};

exports.getAvailableQuizzes = async (req, res) => {
    try {
        const quizzes = await Quiz.find({ isActive: true }).sort({ createdAt: -1 });
        const results = await Promise.all(quizzes.map(async (q) => {
            const passed = await Certificate.findOne({ eventName: `Certified: ${q.topic}`, studentEmail: req.user.email.toLowerCase() });
            return { ...q.toObject(), hasPassed: !!passed, certificateId: passed?.certificateId };
        }));
        res.json(results);
    } catch (error) { res.status(500).json({ message: "Fetch failed" }); }
};

exports.submitQuiz = async (req, res) => {
    const { quizId, score } = req.body;
    try {
        const quiz = await Quiz.findById(quizId);
        const percentage = (score / quiz.totalQuestions) * 100;
        if (percentage < quiz.passingScore) return res.json({ passed: false, score: percentage });

        const student = await User.findById(req.user.id);
        const certName = `Certified: ${quiz.topic}`;
        const certId = `SKILL-${nanoid(8)}`;

        const newCert = new Certificate({
            certificateId: certId,
            studentName: student.name,
            studentEmail: student.email.toLowerCase(),
            eventName: certName,
            eventDate: new Date(),
            issuedBy: req.user.id,
            verificationUrl: `/verify/${certId}`
        });
        await newCert.save();
        res.json({ passed: true, certificateId: certId, score: percentage });
    } catch (error) { res.status(500).json({ message: "Submit failed" }); }
};

exports.createQuiz = async (req, res) => {
    try {
        const newQuiz = new Quiz({ ...req.body, createdBy: req.user.id, department: req.user.department || 'General' });
        await newQuiz.save();
        res.status(201).json(newQuiz);
    } catch (error) { res.status(500).json({ message: "Create failed" }); }
};