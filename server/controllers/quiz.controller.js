const { GoogleGenerativeAI } = require("@google/generative-ai");
const Quiz = require('../models/quiz.model');
const Certificate = require('../models/certificate.model');
const Event = require('../models/event.model');
const User = require('../models/user.model');
const { nanoid } = require('nanoid');
const crypto = require('crypto');
const { mintNFT } = require('../utils/blockchain');
const { sendCertificateIssued } = require('../utils/mailer');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
            description, 
            totalQuestions, 
            passingScore,
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

// --- 4. NEXT QUESTION (FIXED API VERSION & ERROR HANDLING) ---
exports.nextQuestion = async (req, res) => {
    const { quizId, history } = req.body;
    
    // Stable model names for v1 SDK
    const MODEL_FALLBACKS = [
        "gemini-1.5-flash",
        "gemini-1.5-pro"
    ];

    try {
        const quiz = await Quiz.findById(quizId);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        const currentQIndex = history ? history.length : 0;
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

        const previousQuestionsText = history ? history.map(h => h.questionText).slice(-5).join(" | ") : "";

        const prompt = `Generate ONE multiple-choice question about "${quiz.topic}".
Difficulty: ${difficulty}.
Description: ${quiz.description || 'General information'}.
Do NOT repeat these exact concepts: [${previousQuestionsText}].

Return ONLY valid JSON:
{
  "question": "Question text here",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": "Exact option text",
  "explanation": "Brief explanation"
}`;

        // Model Swapping Loop
        for (const modelName of MODEL_FALLBACKS) {
            try {
                console.log(`🤖 Requesting ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName });
                
                const result = await model.generateContent({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 500,
                    },
                });

                const response = await result.response;
                const text = response.text();
                
                const cleaned = cleanJSON(text);
                const questionData = JSON.parse(cleaned);
                
                // Validate structure
                if (!questionData.question || !Array.isArray(questionData.options) || questionData.options.length !== 4) {
                    throw new Error('Malformed AI response');
                }
                
                questionData.difficulty = difficulty;
                console.log(`✅ Success with ${modelName}`);
                return res.json(questionData);
                
            } catch (error) {
                console.error(`❌ ${modelName} failed:`, error.message);
                // Continue to next model
            }
        }

        // ALL MODELS FAILED - Use local fallback
        console.error('⚠️ All AI models failed, using static fallback');
        return res.json(getFallbackQuestion(quiz.topic, difficulty));

    } catch (error) {
        console.error("Critical Quiz Error:", error);
        return res.status(500).json({ message: "Internal server error during quiz generation" });
    }
};

// STATIC FALLBACK DATA
function getFallbackQuestion(topic, difficulty) {
    return {
        question: `Which of the following is a fundamental concept in ${topic}?`,
        options: [
            "Core theoretical principles",
            "Random external variables",
            "Geographical locations",
            "Historical dates only"
        ],
        correctAnswer: "Core theoretical principles",
        explanation: "The AI service is currently overloaded. Please continue with this general assessment question.",
        difficulty
    };
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

        const existing = await Certificate.findOne({ eventName: certName, studentEmail: normalizedEmail });
        if (existing) {
            return res.json({ 
                passed: true, 
                score: percentage,
                certificateId: existing.certificateId,
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
        sendCertificateIssued(normalizedEmail, student.name, certName, certId).catch(e => console.error(e));

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