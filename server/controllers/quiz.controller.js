// In server/controllers/quiz.controller.js
const { GoogleGenerativeAI } = require("@google/generative-ai"); // Using the installed SDK
const Quiz = require('../models/quiz.model');
const Certificate = require('../models/certificate.model');
const Event = require('../models/event.model');
const User = require('../models/user.model');
const { nanoid } = require('nanoid');
const crypto = require('crypto');
const { mintNFT } = require('../utils/blockchain');
const { sendCertificateIssued } = require('../utils/mailer');

// --- CONFIGURATION ---
// Use the stable alias. Google routes this to the best available version.
const MODEL_NAME = "gemini-1.5-flash"; 
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper to clean AI response
const cleanJSON = (text) => {
    if (!text) return "";
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

// --- FAILSAFE QUESTION GENERATOR ---
// If AI crashes, we serve this instead of a 500 Error
const getFallbackQuestion = (topic, difficulty) => {
    return {
        question: `(Backup Mode) Which of the following describes ${topic}?`,
        options: [
            "A popular technology concept", 
            "A type of food", 
            "A geographical location", 
            "A historical event"
        ],
        correctAnswer: "A popular technology concept",
        explanation: "The AI service is temporarily busy, but you can continue the quiz!",
        difficulty: difficulty
    };
};

// --- 1. CREATE QUIZ ---
exports.createQuiz = async (req, res) => {
    try {
        const { topic, description, totalQuestions, passingScore } = req.body;
        // Handle missing department gracefully
        const userDept = req.user.department ? req.user.department.toUpperCase() : 'GENERAL';

        const newQuiz = new Quiz({
            topic: topic.trim(),
            description, totalQuestions, passingScore,
            createdBy: req.user.id,
            department: userDept
        });
        await newQuiz.save();

        // Create Shadow Event for Certificate
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
        res.status(500).json({ message: "Failed to create quiz" });
    }
};

// --- 2. GET QUIZZES ---
exports.getAvailableQuizzes = async (req, res) => {
    try {
        const dept = req.user.department ? req.user.department.toUpperCase() : 'GENERAL';
        const query = { isActive: true };
        query.$or = [{ department: dept }, { department: 'All' }, { department: 'College' }];
        
        const quizzes = await Quiz.find(query).populate('createdBy', 'name');

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

// --- 3. GET QUIZ DETAILS ---
exports.getQuizDetails = async (req, res) => {
    try {
        const { quizId } = req.params;
        const quiz = await Quiz.findById(quizId);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

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

        // Difficulty Logic
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

        const previousQuestionsText = history ? history.map(h => h.questionText).join(" | ") : "";

        // --- AI GENERATION ---
        try {
            const model = genAI.getGenerativeModel({ model: MODEL_NAME });
            
            const prompt = `
                Generate ONE multiple-choice question about "${quiz.topic}".
                Difficulty Level: ${difficulty}.
                Do NOT repeat these concepts: [${previousQuestionsText}].
                Return ONLY valid JSON in this format:
                {
                    "question": "Text",
                    "options": ["A", "B", "C", "D"],
                    "correctAnswer": "Exact text of correct option",
                    "explanation": "Reason"
                }
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            const cleaned = cleanJSON(text);
            const questionData = JSON.parse(cleaned);
            
            questionData.difficulty = difficulty;
            return res.json(questionData);

        } catch (aiError) {
            console.error("AI Generation Failed:", aiError.message);
            // Return Fallback Question instead of crashing
            return res.json(getFallbackQuestion(quiz.topic, difficulty));
        }

    } catch (error) {
        console.error("Critical Server Error:", error);
        // Even in a critical error, try to keep the user moving
        res.json(getFallbackQuestion("Unknown Topic", difficulty));
    }
};

// --- 5. SUBMIT & MINT ---
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

        if (await Certificate.findOne({ eventName: certName, studentEmail: normalizedEmail })) {
            return res.json({ passed: true, message: "You already have this certificate!" });
        }

        let txHash = "PENDING";
        let tokenId = "PENDING"; 
        
        if (student.walletAddress) {
            try {
                const hashData = normalizedEmail + new Date() + certName;
                const certHash = crypto.createHash('sha256').update(hashData).digest('hex');
                const mintResult = await mintNFT(student.walletAddress, certHash);
                txHash = mintResult.transactionHash;
                tokenId = mintResult.tokenId.toString();
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