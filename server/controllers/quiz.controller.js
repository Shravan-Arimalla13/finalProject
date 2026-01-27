// server/controllers/quiz.controller.js - COMPLETE FIXED VERSION
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
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-3-flash-preview"
];

const cleanJSON = (text) => {
    if (!text) return "";
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

// --- ENHANCED FALLBACK with variety ---
function getFallbackQuestion(topic, difficulty, questionNumber) {
    const templates = [
        {
            question: `Which of the following best describes ${topic}?`,
            options: [
                "A fundamental concept in computer science",
                "An outdated technology",
                "Only relevant for research",
                "A marketing buzzword"
            ],
            correctAnswer: "A fundamental concept in computer science",
            explanation: `${topic} is an important concept in modern technology.`
        },
        {
            question: `What is a key characteristic of ${topic}?`,
            options: [
                "It requires extensive theoretical knowledge",
                "It has no practical applications",
                "It is only used by large companies",
                "It was invented recently"
            ],
            correctAnswer: "It requires extensive theoretical knowledge",
            explanation: `Understanding ${topic} requires solid foundational knowledge.`
        },
        {
            question: `Which skill is most closely related to ${topic}?`,
            options: [
                "Problem-solving and logical thinking",
                "Physical fitness",
                "Artistic creativity only",
                "Foreign language proficiency"
            ],
            correctAnswer: "Problem-solving and logical thinking",
            explanation: `${topic} heavily relies on analytical skills.`
        }
    ];
    
    const index = questionNumber % templates.length;
    return {
        ...templates[index],
        difficulty,
        questionNumber,
        isFallback: true
    };
}

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

// --- 4. NEXT QUESTION (FIXED) ---
exports.nextQuestion = async (req, res) => {
    const { quizId, history } = req.body;

    try {
        const quiz = await Quiz.findById(quizId);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        // CRITICAL FIX: Check if we've reached the question limit
        const currentQIndex = history ? history.length : 0;
        
        if (currentQIndex >= quiz.totalQuestions) {
            console.log(`✅ Quiz limit reached: ${currentQIndex}/${quiz.totalQuestions} questions`);
            return res.status(400).json({ 
                message: "Quiz completed. Please submit.",
                limitReached: true 
            });
        }

        // Calculate difficulty based on performance
        let difficulty = 'Medium';
        if (currentQIndex < 3) {
            difficulty = 'Easy';
        } else if (currentQIndex >= quiz.totalQuestions - 3) {
            difficulty = 'Hard';
        } else if (history) {
            const recentAnswers = history.slice(-3);
            const recentCorrect = recentAnswers.filter(a => a.isCorrect).length;
            if (recentCorrect >= 2) difficulty = 'Hard';
            else if (recentCorrect === 0) difficulty = 'Easy';
        }

        // Extract previous questions to avoid repeats
        const previousQuestions = history ? history.map(h => h.questionText) : [];
        const previousTopics = previousQuestions.join(" | ");

        // ENHANCED PROMPT with repeat prevention
        const prompt = `Generate ONE unique multiple-choice question about "${quiz.topic}".

IMPORTANT RULES:
1. Question must be DIFFERENT from these: ${previousTopics || "None yet"}
2. Difficulty: ${difficulty}
3. Provide exactly 4 distinct options
4. Make the correct answer unambiguous
5. Return ONLY valid JSON, no markdown

Required format:
{
  "question": "Clear question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "Exact text of one option",
  "explanation": "Brief explanation"
}`;

        console.log(`📝 Generating Q${currentQIndex + 1}/${quiz.totalQuestions} (${difficulty})`);

        // TRY MODELS
        for (const modelName of MODEL_PRIORITY) {
            try {
                console.log(`🤖 Trying: ${modelName}`);
                
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();
                
                if (text) {
                    const questionData = JSON.parse(cleanJSON(text));
                    
                    // Validate
                    if (!questionData.question || !Array.isArray(questionData.options) || 
                        questionData.options.length !== 4 || !questionData.correctAnswer) {
                        console.warn(`⚠️ Invalid data from ${modelName}`);
                        continue;
                    }

                    // Normalize
                    questionData.correctAnswer = questionData.correctAnswer.trim();
                    questionData.options = questionData.options.map(opt => opt.trim());
                    questionData.difficulty = difficulty;
                    questionData.questionNumber = currentQIndex + 1;
                    
                    // Verify answer in options
                    const answerExists = questionData.options.some(opt => 
                        opt.toLowerCase() === questionData.correctAnswer.toLowerCase()
                    );
                    
                    if (!answerExists) {
                        console.warn(`⚠️ Answer not in options: ${modelName}`);
                        // Fix: Use first option as correct answer
                        questionData.correctAnswer = questionData.options[0];
                    }
                    
                    console.log(`✅ Generated by ${modelName}`);
                    return res.json(questionData);
                }
            } catch (error) {
                console.error(`❌ ${modelName} failed: ${error.message}`);
                continue;
            }
        }

        // FALLBACK
        console.error("⚠️ All AI failed. Using fallback.");
        return res.json(getFallbackQuestion(quiz.topic, difficulty, currentQIndex + 1));

    } catch (error) {
        console.error("Critical Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// --- 5. SUBMIT & MINT (FIXED) ---
exports.submitQuiz = async (req, res) => {
    const { quizId, score } = req.body;
    const userId = req.user.id;

    try {
        const quiz = await Quiz.findById(quizId);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        // FIXED: Calculate percentage correctly
        const correctAnswers = Math.round(score); // score is already the count
        const percentage = (correctAnswers / quiz.totalQuestions) * 100;

        console.log(`📊 Quiz submission: ${correctAnswers}/${quiz.totalQuestions} = ${percentage.toFixed(1)}%`);

        if (percentage < quiz.passingScore) {
            return res.json({ 
                passed: false, 
                score: percentage.toFixed(1),
                correctAnswers: correctAnswers,
                totalQuestions: quiz.totalQuestions,
                message: `Score: ${percentage.toFixed(1)}% (Need ${quiz.passingScore}%)` 
            });
        }

        const student = await User.findById(userId);
        const certName = `Certified: ${quiz.topic}`;
        const normalizedEmail = student.email.toLowerCase();

        // Check for existing certificate
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

        // Create certificate
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
        
        // Send email
        sendCertificateIssued(normalizedEmail, student.name, certName, certId)
            .catch(e => console.error('Email failed:', e));

        res.json({ 
            passed: true, 
            score: percentage.toFixed(1),
            correctAnswers: correctAnswers,
            totalQuestions: quiz.totalQuestions,
            certificateId: certId, 
            message: "Quiz Passed! Certificate Issued." 
        });

    } catch (error) {
        console.error('Submit Quiz Error:', error);
        res.status(500).json({ message: "Error submitting quiz" });
    }
};

module.exports = exports;