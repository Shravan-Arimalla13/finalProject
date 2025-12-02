// In server/controllers/quiz.controller.js
const { GoogleGenAI } = require("@google/genai");
const Quiz = require('../models/quiz.model');
const Certificate = require('../models/certificate.model');
const Event = require('../models/event.model');
const User = require('../models/user.model');
const { nanoid } = require('nanoid');
const crypto = require('crypto');
const { mintNFT } = require('../utils/blockchain');
const { sendCertificateIssued } = require('../utils/mailer');

// Initialize the client
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Helper to clean AI response
const cleanJSON = (text) => {
    if (!text) return "";
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

// --- 1. CREATE QUIZ ---
exports.createQuiz = async (req, res) => {
    try {
        const { topic, description, totalQuestions, passingScore } = req.body;
        
        // Handle case where user department might be missing
        // FORCE UPPERCASE to match your standardized data
        const userDept = (req.user.department || 'General').toUpperCase();

        const newQuiz = new Quiz({
            topic: topic.trim(), // Remove extra spaces
            description, 
            totalQuestions, 
            passingScore,
            createdBy: req.user.id,
            department: userDept
        });
        await newQuiz.save();

        // Create Shadow Event for Certificate Config
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
                certificateConfig: {
                    collegeName: "K. S. Institute of Technology",
                    headerDepartment: `DEPARTMENT OF ${userDept}`, // Professional Header
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

// --- 2. GET QUIZZES ---
exports.getAvailableQuizzes = async (req, res) => {
    try {
        const studentDept = req.user.department ? req.user.department.toUpperCase() : 'GENERAL';
        
        const query = { isActive: true };
        // Show quizzes for Student's department OR 'All' OR 'College'
        query.$or = [{ department: studentDept }, { department: 'All' }, { department: 'College' }];
        
        const quizzes = await Quiz.find(query).populate('createdBy', 'name');

        const quizzesWithStatus = await Promise.all(quizzes.map(async (quiz) => {
            const certName = `Certified: ${quiz.topic}`;
            const hasCert = await Certificate.findOne({ 
                eventName: certName, 
                studentEmail: req.user.email.toLowerCase() 
            });
            return {
                ...quiz.toObject(),
                hasPassed: !!hasCert, // Boolean: true if cert exists
                certificateId: hasCert ? hasCert.certificateId : null
            };
        }));

        res.json(quizzesWithStatus);
    } catch (error) {
        console.error("Fetch Quiz Error:", error);
        res.status(500).json({ message: "Failed to fetch quizzes" });
    }
};

// --- 3. GET QUIZ DETAILS ---
exports.getQuizDetails = async (req, res) => {
    try {
        const { quizId } = req.params;
        const quiz = await Quiz.findById(quizId);
        
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        // Check if already passed
        const certName = `Certified: ${quiz.topic}`;
        const existingCert = await Certificate.findOne({ 
            eventName: certName, 
            studentEmail: req.user.email.toLowerCase() 
        });

        res.json({
            topic: quiz.topic,
            totalQuestions: quiz.totalQuestions,
            passingScore: quiz.passingScore,
            hasPassed: !!existingCert,
            certificateId: existingCert?.certificateId
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

// --- 4. NEXT QUESTION (AI Engine) ---
exports.nextQuestion = async (req, res) => {
    const { quizId, history } = req.body;

    try {
        const quiz = await Quiz.findById(quizId);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        const currentQIndex = history ? history.length : 0;
        
        // Difficulty Logic
        let difficulty = 'Medium';
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

        const previousQuestionsText = history ? history.map(h => h.questionText).join(" | ") : "";

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

        // Call AI
        const response = await genAI.models.generateContent({
            model: 'gemini-1.5-flash-001', 
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        // Parse Response
        const responseText = typeof response.text === 'function' ? response.text() : response.text;
        let questionData;
        try {
             const cleaned = cleanJSON(responseText);
             questionData = JSON.parse(cleaned);
        } catch (e) {
             console.error("JSON Parse Error:", e); 
             questionData = {
                 question: "AI is calibrating... Click any option.",
                 options: ["Continue", "Retry"],
                 correctAnswer: "Continue",
                 explanation: "AI returned invalid data."
             };
        }

        questionData.difficulty = difficulty;
        res.json(questionData);

    } catch (error) {
        console.error("AI Generation Error:", error.message);
        res.status(500).json({ message: "AI Service Error" });
    }
};

// --- 5. SUBMIT QUIZ ---
exports.submitQuiz = async (req, res) => {
    const { quizId, score } = req.body;
    const userId = req.user.id;

    try {
        const quiz = await Quiz.findById(quizId);
        const percentage = (score / quiz.totalQuestions) * 100;

        if (percentage < quiz.passingScore) {
            return res.json({ passed: false, message: `Score: ${percentage.toFixed(1)}%. Required: ${quiz.passingScore}%.` });
        }

        const student = await User.findById(userId);
        const certName = `Certified: ${quiz.topic}`;
        const normalizedEmail = student.email.toLowerCase();

        // DOUBLE CHECK: Has certificate?
        if (await Certificate.findOne({ eventName: certName, studentEmail: normalizedEmail })) {
            return res.json({ passed: true, message: "You already have this certificate!" });
        }

        let txHash = "PENDING";
        let tokenId = Math.floor(Math.random() * 10000);
        
        if (student.walletAddress) {
            try {
                const hashData = normalizedEmail + new Date() + certName;
                const certHash = crypto.createHash('sha256').update(hashData).digest('hex');
                const mintResult = await mintNFT(student.walletAddress, certHash);
                txHash = mintResult.transactionHash;
                tokenId = mintResult.tokenId;
            } catch (e) { console.error("Minting warning:", e.message); }
        }

        const certId = `SKILL-${nanoid(8)}`;
        const newCert = new Certificate({
            certificateId: certId,
            tokenId,
            certificateHash: txHash,
            transactionHash: txHash,
            studentName: student.name,
            studentEmail: normalizedEmail,
            eventName: certName,
            eventDate: new Date(),
            issuedBy: userId,
            verificationUrl: `/verify/${certId}`
        });
        
        await newCert.save();
        try { sendCertificateIssued(normalizedEmail, student.name, certName, certId); } catch(e) {}

        res.json({ passed: true, certificateId: certId, message: "Quiz Passed! Certificate Issued." });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error submitting quiz" });
    }
};