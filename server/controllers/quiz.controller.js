// server/controllers/quiz.controller.js - FIXED WITH RETRY LOGIC
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Quiz = require('../models/quiz.model');
const Certificate = require('../models/certificate.model');
const Event = require('../models/event.model');
const User = require('../models/user.model');
const { nanoid } = require('nanoid');
const crypto = require('crypto');
const { mintNFT } = require('../utils/blockchain');
const { sendCertificateIssued } = require('../utils/mailer');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_NAME = "gemini-1.5-flash";

const cleanJSON = (text) => {
    if (!text) return "";
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

// --- 1. CREATE QUIZ ---
exports.createQuiz = async (req, res) => {
    try {
        const { topic, description, totalQuestions, passingScore } = req.body;
        const userDept = (req.user.department || 'General').toUpperCase();

        const newQuiz = new Quiz({
            topic: topic.trim(),
            description, totalQuestions, passingScore,
            createdBy: req.user.id,
            department: userDept
        });
        await newQuiz.save();

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
        console.error('Create Quiz Error:', error);
        res.status(500).json({ message: "Failed to create quiz: " + error.message });
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
        console.error('Get Quizzes Error:', error);
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
        console.error('Get Quiz Details Error:', error);
        res.status(500).json({ message: "Server Error" });
    }
};

// --- 4. NEXT QUESTION (WITH RETRY & FALLBACK) ---
exports.nextQuestion = async (req, res) => {
    const { quizId, history } = req.body;
    const MAX_RETRIES = 3;
    let lastError = null;

    try {
        const quiz = await Quiz.findById(quizId);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        const currentQIndex = history ? history.length : 0;
        
        // Determine difficulty
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
            
            Return ONLY valid JSON in this format (no extra text):
            {
                "question": "The question text",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correctAnswer": "The exact text of the correct option",
                "explanation": "Short explanation (max 50 words)"
            }
        `;

        // RETRY LOOP
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                console.log(`🤖 AI Request Attempt ${attempt}/${MAX_RETRIES} for ${quiz.topic}`);
                
                const model = genAI.getGenerativeModel({ model: MODEL_NAME });
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();
                
                const cleaned = cleanJSON(text);
                const questionData = JSON.parse(cleaned);
                
                // Validate response structure
                if (!questionData.question || !Array.isArray(questionData.options) || 
                    questionData.options.length !== 4 || !questionData.correctAnswer) {
                    throw new Error('Invalid AI response structure');
                }
                
                questionData.difficulty = difficulty;
                console.log(`✅ AI Generated Question (Attempt ${attempt})`);
                return res.json(questionData);
                
            } catch (error) {
                lastError = error;
                console.error(`❌ AI Attempt ${attempt} Failed:`, error.message);
                
                // Wait before retry (exponential backoff: 1s, 2s, 4s)
                if (attempt < MAX_RETRIES) {
                    const waitTime = Math.pow(2, attempt - 1) * 1000;
                    console.log(`⏳ Retrying in ${waitTime/1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
        }

        // ALL RETRIES FAILED - Return fallback question
        console.error('❌ All AI attempts failed, using fallback question');
        return res.json(getFallbackQuestion(quiz.topic, difficulty));

    } catch (error) {
        console.error("Critical Quiz Error:", error);
        return res.status(500).json({ 
            message: "Quiz generation failed", 
            details: error.message 
        });
    }
};

// FALLBACK QUESTIONS (When AI fails)
function getFallbackQuestion(topic, difficulty) {
    const fallbacks = {
        Easy: {
            question: `What is a fundamental concept in ${topic}?`,
            options: [
                "Understanding core principles",
                "Ignoring best practices",
                "Skipping documentation",
                "Avoiding learning"
            ],
            correctAnswer: "Understanding core principles",
            explanation: "Core principles are the foundation of mastering any topic."
        },
        Medium: {
            question: `Which approach is most effective when learning ${topic}?`,
            options: [
                "Hands-on practice with real projects",
                "Only reading theory without practice",
                "Memorizing without understanding",
                "Avoiding challenging problems"
            ],
            correctAnswer: "Hands-on practice with real projects",
            explanation: "Practical application reinforces theoretical knowledge."
        },
        Hard: {
            question: `What distinguishes an expert in ${topic} from a beginner?`,
            options: [
                "Deep understanding of tradeoffs and edge cases",
                "Knowing syntax perfectly",
                "Using the latest tools",
                "Writing more lines of code"
            ],
            correctAnswer: "Deep understanding of tradeoffs and edge cases",
            explanation: "Experts can make informed decisions by understanding nuances."
        }
    };

    const fallback = fallbacks[difficulty] || fallbacks.Medium;
    return { ...fallback, difficulty };
}

// --- 5. SUBMIT & MINT ---
exports.submitQuiz = async (req, res) => {
    const { quizId, score } = req.body;
    const userId = req.user.id;

    try {
        const quiz = await Quiz.findById(quizId);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        const percentage = (score / quiz.totalQuestions) * 100;

        if (percentage < quiz.passingScore) {
            return res.json({ 
                passed: false, 
                score: percentage,
                message: `Score: ${percentage.toFixed(1)}%. Required: ${quiz.passingScore}%.` 
            });
        }

        const student = await User.findById(userId);
        const certName = `Certified: ${quiz.topic}`;
        const normalizedEmail = student.email.toLowerCase();

        if (await Certificate.findOne({ eventName: certName, studentEmail: normalizedEmail })) {
            return res.json({ 
                passed: true, 
                score: percentage,
                message: "You already have this certificate!" 
            });
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
            } catch (e) { 
                console.error("Minting warning:", e.message); 
            }
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
        
        try { 
            await sendCertificateIssued(normalizedEmail, student.name, certName, certId); 
        } catch(e) {
            console.error('Email send failed:', e.message);
        }

        res.json({ 
            passed: true, 
            score: percentage,
            certificateId: certId, 
            message: "Quiz Passed! Certificate Issued." 
        });

    } catch (error) {
        console.error('Submit Quiz Error:', error);
        res.status(500).json({ message: "Error submitting quiz" });
    }
};