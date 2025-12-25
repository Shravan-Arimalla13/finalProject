// server/controllers/quiz.controller.js - FIXED GEMINI MODEL NAME
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

// ⚠️ FIX: Use the correct model identifier
// The v1beta API requires specific model names
const MODEL_NAME = "gemini-1.5-flash-latest"; // Changed from "gemini-1.5-flash"

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

// --- 4. NEXT QUESTION (WITH MULTIPLE MODEL FALLBACKS) ---
exports.nextQuestion = async (req, res) => {
    const { quizId, history } = req.body;
    const MAX_RETRIES = 2; // Reduced from 3 since we have multiple models
    
    // Try multiple model names in order of preference
    const MODEL_FALLBACKS = [
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash",
        "gemini-pro"
    ];

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

        const prompt = `Generate ONE multiple-choice question about "${quiz.topic}".
Difficulty: ${difficulty}.
Do NOT repeat: [${previousQuestionsText}].

Return ONLY valid JSON (no markdown, no extra text):
{
  "question": "Question text here",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": "Exact option text",
  "explanation": "Brief explanation (max 40 words)"
}`;

        // TRY EACH MODEL
        for (const modelName of MODEL_FALLBACKS) {
            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                try {
                    console.log(`🤖 Trying ${modelName} (Attempt ${attempt}/${MAX_RETRIES})`);
                    
                    const model = genAI.getGenerativeModel({ model: modelName });
                    
                    // Add timeout to prevent hanging
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Request timeout')), 10000)
                    );
                    
                    const aiPromise = model.generateContent(prompt);
                    const result = await Promise.race([aiPromise, timeoutPromise]);
                    
                    const response = await result.response;
                    const text = response.text();
                    
                    const cleaned = cleanJSON(text);
                    const questionData = JSON.parse(cleaned);
                    
                    // Validate structure
                    if (!questionData.question || !Array.isArray(questionData.options) || 
                        questionData.options.length !== 4 || !questionData.correctAnswer) {
                        throw new Error('Invalid response structure');
                    }
                    
                    questionData.difficulty = difficulty;
                    console.log(`✅ Success with ${modelName}`);
                    return res.json(questionData);
                    
                } catch (error) {
                    console.error(`❌ ${modelName} Attempt ${attempt} Failed:`, error.message);
                    
                    // Don't retry on auth errors
                    if (error.message.includes('API key') || error.message.includes('401')) {
                        console.error('⚠️ API Key issue detected, skipping retries');
                        break;
                    }
                    
                    // Wait before retry
                    if (attempt < MAX_RETRIES) {
                        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                    }
                }
            }
        }

        // ALL MODELS FAILED - Use fallback
        console.error('❌ All AI models failed, using fallback question');
        return res.json(getFallbackQuestion(quiz.topic, difficulty));

    } catch (error) {
        console.error("Critical Quiz Error:", error);
        return res.status(500).json({ 
            message: "Quiz generation failed", 
            details: error.message 
        });
    }
};

// ENHANCED FALLBACK QUESTIONS
function getFallbackQuestion(topic, difficulty) {
    const topicLower = topic.toLowerCase();
    
    // Topic-specific fallbacks
    const specificFallbacks = {
        'javascript': {
            Easy: {
                question: "What is the correct way to declare a variable in modern JavaScript?",
                options: ["let x = 5;", "var x = 5;", "variable x = 5;", "x = 5;"],
                correctAnswer: "let x = 5;",
                explanation: "Let is the modern way to declare block-scoped variables."
            },
            Medium: {
                question: "What does 'this' keyword refer to in JavaScript?",
                options: [
                    "The current execution context",
                    "Always the global object",
                    "The parent function",
                    "The DOM element"
                ],
                correctAnswer: "The current execution context",
                explanation: "'this' refers to the context in which the function is called."
            }
        },
        'python': {
            Easy: {
                question: "Which keyword is used to define a function in Python?",
                options: ["def", "function", "func", "define"],
                correctAnswer: "def",
                explanation: "The 'def' keyword is used to define functions in Python."
            }
        },
        'react': {
            Easy: {
                question: "What hook is used to manage state in functional React components?",
                options: ["useState", "useEffect", "useContext", "useReducer"],
                correctAnswer: "useState",
                explanation: "useState is the primary hook for managing component state."
            }
        }
    };

    // Check for topic-specific fallback
    for (const [key, questions] of Object.entries(specificFallbacks)) {
        if (topicLower.includes(key)) {
            return { ...(questions[difficulty] || questions.Easy), difficulty };
        }
    }

    // Generic fallbacks
    const genericFallbacks = {
        Easy: {
            question: `What is the most important first step when learning ${topic}?`,
            options: [
                "Understanding fundamental concepts",
                "Memorizing all syntax",
                "Building complex projects immediately",
                "Avoiding documentation"
            ],
            correctAnswer: "Understanding fundamental concepts",
            explanation: "Strong fundamentals are essential for mastering any technology."
        },
        Medium: {
            question: `Which learning approach is most effective for ${topic}?`,
            options: [
                "Hands-on practice with real projects",
                "Only reading theory without practice",
                "Watching tutorials without coding",
                "Memorizing without understanding"
            ],
            correctAnswer: "Hands-on practice with real projects",
            explanation: "Active practice reinforces theoretical knowledge effectively."
        },
        Hard: {
            question: `What distinguishes an expert in ${topic}?`,
            options: [
                "Deep understanding of tradeoffs and design patterns",
                "Knowing all syntax by heart",
                "Using the newest tools only",
                "Writing the most code"
            ],
            correctAnswer: "Deep understanding of tradeoffs and design patterns",
            explanation: "Experts can make informed architectural decisions."
        }
    };

    const fallback = genericFallbacks[difficulty] || genericFallbacks.Medium;
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
                certificateId: (await Certificate.findOne({ eventName: certName, studentEmail: normalizedEmail })).certificateId,
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