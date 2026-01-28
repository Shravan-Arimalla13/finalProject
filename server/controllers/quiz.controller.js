// server/controllers/quiz.controller.js - RATE LIMIT OPTIMIZED VERSION
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

const MODEL_PRIORITY = [
    "gemini-2.5-flash",      // Start with more stable model
    "gemini-2.0-flash",      
    "gemini-2.5-flash-lite", // Use lite as fallback
];

const cleanJSON = (text) => {
    if (!text) return "";
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

// ============================================
// RATE LIMIT PROTECTION - Question Cache
// ============================================
const questionCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCacheKey(quizId, questionNumber) {
    return `${quizId}-q${questionNumber}`;
}

function getCachedQuestion(quizId, questionNumber) {
    const key = getCacheKey(quizId, questionNumber);
    const cached = questionCache.get(key);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log(`✅ Using cached question for Q${questionNumber}`);
        return cached.question;
    }
    return null;
}

function cacheQuestion(quizId, questionNumber, question) {
    const key = getCacheKey(quizId, questionNumber);
    questionCache.set(key, {
        question,
        timestamp: Date.now()
    });
    
    // Auto-cleanup old cache entries
    if (questionCache.size > 100) {
        const firstKey = questionCache.keys().next().value;
        questionCache.delete(firstKey);
    }
}

// ============================================
// FALLBACK QUESTIONS (Enhanced)
// ============================================
function getFallbackQuestion(topic, difficulty, questionNumber) {
    const templates = [
        {
            question: `Which of the following is a core concept in ${topic}?`,
            options: [
                "Fundamental principles and best practices",
                "Outdated legacy approaches",
                "Theoretical concepts with no practical use",
                "Marketing terminology only"
            ],
            correctAnswer: "Fundamental principles and best practices",
            explanation: `${topic} is built on foundational concepts that are essential for practical application.`
        },
        {
            question: `What is the primary purpose of ${topic}?`,
            options: [
                "To solve real-world problems efficiently",
                "To add unnecessary complexity",
                "To replace all existing solutions",
                "To serve as documentation only"
            ],
            correctAnswer: "To solve real-world problems efficiently",
            explanation: `${topic} is designed to address practical challenges in development.`
        },
        {
            question: `Which skill is most important when working with ${topic}?`,
            options: [
                "Problem-solving and analytical thinking",
                "Memorizing syntax only",
                "Following trends blindly",
                "Avoiding documentation"
            ],
            correctAnswer: "Problem-solving and analytical thinking",
            explanation: `Success with ${topic} requires strong analytical and problem-solving abilities.`
        },
        {
            question: `How does ${topic} improve development processes?`,
            options: [
                "By providing structured and maintainable solutions",
                "By making code more complex",
                "By eliminating the need for testing",
                "By replacing all other tools"
            ],
            correctAnswer: "By providing structured and maintainable solutions",
            explanation: `${topic} helps developers create more organized and maintainable code.`
        },
        {
            question: `What is a common use case for ${topic}?`,
            options: [
                "Building scalable and efficient applications",
                "Creating simple static websites only",
                "Replacing manual processes with slower automated ones",
                "Documentation purposes exclusively"
            ],
            correctAnswer: "Building scalable and efficient applications",
            explanation: `${topic} is commonly used in developing robust, scalable applications.`
        }
    ];
    
    const index = (questionNumber - 1) % templates.length;
    return {
        ...templates[index],
        difficulty,
        questionNumber,
        isFallback: true
    };
}

// ============================================
// CREATE QUIZ
// ============================================
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

// ============================================
// GET AVAILABLE QUIZZES
// ============================================
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

// ============================================
// GET QUIZ DETAILS
// ============================================
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

// ============================================
// NEXT QUESTION (OPTIMIZED)
// ============================================
exports.nextQuestion = async (req, res) => {
    const { quizId, history } = req.body;

    try {
        const quiz = await Quiz.findById(quizId);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        const currentQIndex = history ? history.length : 0;
        
        // CRITICAL: Check limit
        if (currentQIndex >= quiz.totalQuestions) {
            console.log(`✅ Limit reached: ${currentQIndex}/${quiz.totalQuestions}`);
            return res.status(400).json({ 
                message: "Quiz completed. Please submit.",
                limitReached: true 
            });
        }

        const questionNumber = currentQIndex + 1;

        // OPTIMIZATION: Check cache first
        const cachedQuestion = getCachedQuestion(quizId, questionNumber);
        if (cachedQuestion) {
            return res.json(cachedQuestion);
        }

        // Calculate difficulty
        let difficulty = 'Medium';
        if (questionNumber <= 2) {
            difficulty = 'Easy';
        } else if (questionNumber >= quiz.totalQuestions - 2) {
            difficulty = 'Hard';
        } else if (history && history.length >= 3) {
            const recent = history.slice(-3);
            const correctCount = recent.filter(a => a.isCorrect).length;
            if (correctCount >= 2) difficulty = 'Hard';
            else if (correctCount === 0) difficulty = 'Easy';
        }

        // Build prompt
        const previousQuestions = history ? history.map(h => h.questionText).join(" | ") : "";
        const prompt = `Generate ONE unique multiple-choice question about "${quiz.topic}".

RULES:
1. Must be different from: ${previousQuestions || "None yet"}
2. Difficulty: ${difficulty}
3. Exactly 4 options
4. One correct answer that exists in options
5. Return ONLY valid JSON

Format:
{
  "question": "question text",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": "exact text from options",
  "explanation": "brief explanation"
}`;

        console.log(`📝 Generating Q${questionNumber}/${quiz.totalQuestions} (${difficulty})`);

        // Try AI models with error handling
        let generatedQuestion = null;
        
        for (const modelName of MODEL_PRIORITY) {
            try {
                console.log(`🤖 Trying: ${modelName}`);
                
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();
                
                if (!text) continue;

                const questionData = JSON.parse(cleanJSON(text));
                
                // Validate structure
                if (!questionData.question || !Array.isArray(questionData.options) || 
                    questionData.options.length !== 4 || !questionData.correctAnswer) {
                    console.warn(`⚠️ Invalid structure from ${modelName}`);
                    continue;
                }

                // Normalize
                questionData.correctAnswer = questionData.correctAnswer.trim();
                questionData.options = questionData.options.map(opt => opt.trim());
                questionData.difficulty = difficulty;
                questionData.questionNumber = questionNumber;
                
                // Verify answer exists in options
                const answerExists = questionData.options.some(opt => 
                    opt.toLowerCase() === questionData.correctAnswer.toLowerCase()
                );
                
                if (!answerExists) {
                    console.warn(`⚠️ Answer mismatch in ${modelName}, auto-fixing`);
                    questionData.correctAnswer = questionData.options[0];
                }
                
                generatedQuestion = questionData;
                console.log(`✅ Generated by ${modelName}`);
                break;
                
            } catch (error) {
                // Rate limit detection
                if (error.message.includes('429') || error.message.includes('quota')) {
                    console.error(`⚠️ Rate limit hit on ${modelName}, trying next...`);
                    continue;
                }
                
                console.error(`❌ ${modelName} error: ${error.message}`);
                continue;
            }
        }

        // Use fallback if all models failed
        if (!generatedQuestion) {
            console.warn(`⚠️ All AI models failed/exhausted, using fallback`);
            generatedQuestion = getFallbackQuestion(quiz.topic, difficulty, questionNumber);
        }

        // Cache the question
        cacheQuestion(quizId, questionNumber, generatedQuestion);
        
        return res.json(generatedQuestion);

    } catch (error) {
        console.error("Critical Error:", error);
        
        // Emergency fallback
        const questionNumber = (history ? history.length : 0) + 1;
        return res.json(getFallbackQuestion(
            'this topic', 
            'Easy', 
            questionNumber
        ));
    }
};

// ============================================
// SUBMIT QUIZ
// ============================================
exports.submitQuiz = async (req, res) => {
    const { quizId, score } = req.body;
    const userId = req.user.id;

    try {
        const quiz = await Quiz.findById(quizId);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        const correctAnswers = Math.round(score);
        const percentage = (correctAnswers / quiz.totalQuestions) * 100;

        console.log(`📊 Submission: ${correctAnswers}/${quiz.totalQuestions} = ${percentage.toFixed(1)}%`);

        if (percentage < quiz.passingScore) {
            return res.json({ 
                passed: false, 
                score: percentage.toFixed(1),
                correctAnswers,
                totalQuestions: quiz.totalQuestions,
                message: `Score: ${percentage.toFixed(1)}% (Need ${quiz.passingScore}%)` 
            });
        }

        const student = await User.findById(userId);
        const certName = `Certified: ${quiz.topic}`;
        const normalizedEmail = student.email.toLowerCase();

        const existing = await Certificate.findOne({ 
            eventName: certName, 
            studentEmail: normalizedEmail 
        });
        
        if (existing) {
            return res.json({ 
                passed: true, 
                score: percentage.toFixed(1),
                certificateId: existing.certificateId,
                message: "Certificate already issued!" 
            });
        }

        // Mint NFT
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
        
        sendCertificateIssued(normalizedEmail, student.name, certName, certId)
            .catch(e => console.error('Email failed:', e));

        res.json({ 
            passed: true, 
            score: percentage.toFixed(1),
            correctAnswers,
            totalQuestions: quiz.totalQuestions,
            certificateId: certId, 
            message: "Passed! Certificate Issued." 
        });

    } catch (error) {
        console.error('Submit Error:', error);
        res.status(500).json({ message: "Submission error" });
    }
};

module.exports = exports;