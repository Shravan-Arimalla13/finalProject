// server/controllers/quiz.controller.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Quiz = require('../models/quiz.model');
const Certificate = require('../models/certificate.model');
const Event = require('../models/event.model');
const User = require('../models/user.model');
const { nanoid } = require('nanoid');
const crypto = require('crypto');
const { mintNFT } = require('../utils/blockchain');
const { sendCertificateIssued } = require('../utils/mailer');

// --- CONFIGURATION ---
const MODEL_NAME = "gemini-1.5-flash"; // Stable free-tier model
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper to clean AI response
const cleanJSON = (text) => {
    if (!text) return "";
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

// --- FAILSAFE QUESTION GENERATOR ---
// If AI crashes, we serve this instead of a 500 Error to keep the student moving
const getFallbackQuestion = (topic, difficulty) => {
    return {
        question: `Which of the following best describes a fundamental concept within ${topic}?`,
        options: [
            "A core theoretical principle of the subject", 
            "A completely unrelated external factor", 
            "A geographical location", 
            "A historical date"
        ],
        correctAnswer: "A core theoretical principle of the subject",
        explanation: "The AI service is temporarily busy. We provided a backup question so you don't lose your progress!",
        difficulty: difficulty || 'Medium'
    };
};

// --- 1. CREATE QUIZ ---
exports.createQuiz = async (req, res) => {
    try {
        const { topic, description, totalQuestions, passingScore } = req.body;
        const userDept = (req.user.department || 'General').toUpperCase();

        const newQuiz = new Quiz({
            topic: topic.trim(),
            description: description.trim(),
            totalQuestions: totalQuestions || 15,
            passingScore: passingScore || 60,
            createdBy: req.user.id,
            department: userDept,
            isActive: true
        });
        await newQuiz.save();

        // Create Shadow Event for Certificates
        const certName = `Certified: ${topic.trim()}`;
        const existingEvent = await Event.findOne({ name: certName });

        if (!existingEvent) {
            await Event.create({
                name: certName,
                date: new Date(),
                description: `Skill Assessment for ${topic}`,
                createdBy: req.user.id,
                department: userDept,
                isPublic: false,
                certificatesIssued: true,
                startTime: "00:00",
                endTime: "23:59",
                certificateConfig: {
                    collegeName: "K. S. Institute of Technology",
                    headerDepartment: `DEPARTMENT OF ${userDept}`,
                    certificateTitle: "CERTIFICATE OF SKILL",
                    eventType: "Skill Assessment",
                    customSignatureText: "Examination Authority"
                }
            });
        }
        res.status(201).json(newQuiz);
    } catch (error) {
        console.error("Create Quiz Error:", error);
        res.status(500).json({ message: "Failed to create quiz: " + error.message });
    }
};

// --- 2. GET AVAILABLE QUIZZES ---
exports.getAvailableQuizzes = async (req, res) => {
    try {
        const quizzes = await Quiz.find({ isActive: true }).sort({ createdAt: -1 });
        const quizzesWithStatus = await Promise.all(quizzes.map(async (quiz) => {
            const hasCert = await Certificate.findOne({ 
                eventName: `Certified: ${quiz.topic}`, 
                studentEmail: req.user.email.toLowerCase() 
            });
            return { ...quiz.toObject(), hasPassed: !!hasCert, certificateId: hasCert?.certificateId };
        }));
        res.json(quizzesWithStatus);
    } catch (error) {
        res.status(500).json({ message: "Error fetching quizzes" });
    }
};

// --- 3. GET QUIZ DETAILS ---
exports.getQuizDetails = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.quizId);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });
        res.json(quiz);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

// --- 4. NEXT QUESTION (With Failsafe) ---
exports.nextQuestion = async (req, res) => {
    const { quizId, history } = req.body;
    let difficulty = 'Medium';

    try {
        const quiz = await Quiz.findById(quizId);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        // Adaptive Difficulty Logic
        const currentQIndex = history ? history.length : 0;
        const phase1Limit = Math.floor(quiz.totalQuestions * 0.33);

        if (currentQIndex < phase1Limit) {
            difficulty = 'Easy';
        } else if (history && history.length >= 3) {
            const recent = history.slice(-3);
            const correctCount = recent.filter(h => h.isCorrect).length;
            if (correctCount === 3) difficulty = 'Hard';
            else if (correctCount >= 1) difficulty = 'Medium';
            else difficulty = 'Easy';
        }

        const previousQuestionsText = history ? history.map(h => h.questionText).slice(-5).join(" | ") : "";

        // AI Generation Prompt
        const prompt = `
            Generate ONE multiple-choice question about "${quiz.topic}".
            Difficulty Level: ${difficulty}.
            DO NOT repeat these concepts: [${previousQuestionsText}].
            
            Return ONLY valid JSON in this format:
            {
                "question": "The question text",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correctAnswer": "The exact text of the correct option",
                "explanation": "Short explanation"
            }
        `;

        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        const cleaned = cleanJSON(text);
        const questionData = JSON.parse(cleaned);
        
        questionData.difficulty = difficulty;
        res.json(questionData);

    } catch (error) {
        console.error("AI Generation Error:", error.message);
        // Return Fallback Question instead of crashing the server/app
        res.json(getFallbackQuestion(req.body.topic || "the topic", difficulty));
    }
};

// --- 5. SUBMIT QUIZ ---
exports.submitQuiz = async (req, res) => {
    const { quizId, score } = req.body;
    try {
        const quiz = await Quiz.findById(quizId);
        const percentage = (score / quiz.totalQuestions) * 100;
        
        if (percentage >= quiz.passingScore) {
            const student = await User.findById(req.user.id);
            const certId = `SKILL-${nanoid(8)}`;
            
            const newCert = new Certificate({
                certificateId: certId,
                studentName: student.name,
                studentEmail: student.email.toLowerCase(),
                eventName: `Certified: ${quiz.topic}`,
                eventDate: new Date(),
                issuedBy: req.user.id,
                verificationUrl: `/verify/${certId}`
            });
            await newCert.save();
            res.json({ passed: true, score: percentage, certificateId: certId });
        } else {
            res.json({ passed: false, score: percentage });
        }
    } catch (error) {
        res.status(500).json({ message: "Submission failed" });
    }
};