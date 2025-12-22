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

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_NAME = "gemini-2.0-flash-exp";

// Configuration for AI generation
const AI_CONFIG = {
    maxRetries: 3,
    timeoutMs: 15000,
    temperature: 0.7, // Balance between creativity and consistency
    maxOutputTokens: 500
};

/**
 * Clean AI-generated JSON response
 * Removes markdown code blocks and extra whitespace
 * @param {string} text - Raw AI response
 * @returns {string} Cleaned JSON string
 */
const cleanJSON = (text) => {
    if (!text) return "";
    return text
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
};

/**
 * Generate AI question with comprehensive retry logic
 * Implements timeout, exponential backoff, and error categorization
 * @param {string} prompt - The generation prompt
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<string>} Generated text
 * @throws {Error} If all attempts fail
 */
async function generateQuestionWithRetry(prompt, maxRetries = AI_CONFIG.maxRetries) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🤖 AI Generation Attempt ${attempt}/${maxRetries}`);
            
            const model = genAI.getGenerativeModel({ 
                model: MODEL_NAME,
                generationConfig: {
                    temperature: AI_CONFIG.temperature,
                    maxOutputTokens: AI_CONFIG.maxOutputTokens
                }
            });
            
            // Create timeout wrapper to prevent hanging requests
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('AI request timeout')), AI_CONFIG.timeoutMs);
            });
            
            const generationPromise = model.generateContent(prompt);
            
            // Race between generation and timeout
            const result = await Promise.race([generationPromise, timeoutPromise]);
            const response = await result.response;
            const text = response.text();
            
            // Validate response
            if (!text || text.length < 50) {
                throw new Error('AI response too short or empty');
            }
            
            console.log(`✅ AI generated question successfully (attempt ${attempt})`);
            return text;
            
        } catch (error) {
            lastError = error;
            console.error(`❌ AI Generation Attempt ${attempt} Failed:`, error.message);
            
            // Categorize error types
            const errorType = categorizeAIError(error);
            console.error(`   Error Type: ${errorType}`);
            
            // Don't retry for certain error types
            if (errorType === 'QUOTA_EXCEEDED' || errorType === 'INVALID_API_KEY') {
                console.error('   Non-retryable error detected, stopping attempts');
                throw new Error(`AI service error: ${errorType}`);
            }
            
            // Wait before retry with exponential backoff (2s, 4s, 8s)
            if (attempt < maxRetries) {
                const waitTime = Math.pow(2, attempt) * 1000;
                console.log(`⏳ Retrying in ${waitTime/1000}s...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }
    
    // All attempts exhausted
    throw new Error(`AI generation failed after ${maxRetries} attempts: ${lastError.message}`);
}

/**
 * Categorize AI errors for better handling
 * @param {Error} error - The error object
 * @returns {string} Error category
 */
function categorizeAIError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('quota') || message.includes('rate limit')) {
        return 'QUOTA_EXCEEDED';
    }
    if (message.includes('api key') || message.includes('authentication')) {
        return 'INVALID_API_KEY';
    }
    if (message.includes('timeout')) {
        return 'TIMEOUT';
    }
    if (message.includes('network') || message.includes('econnrefused')) {
        return 'NETWORK_ERROR';
    }
    
    return 'UNKNOWN';
}

/**
 * Validate question data structure
 * @param {Object} questionData - Parsed question object
 * @returns {boolean} True if valid
 * @throws {Error} If invalid structure
 */
function validateQuestionData(questionData) {
    const required = ['question', 'options', 'correctAnswer', 'explanation'];
    
    for (const field of required) {
        if (!questionData[field]) {
            throw new Error(`Missing required field: ${field}`);
        }
    }
    
    if (!Array.isArray(questionData.options) || questionData.options.length !== 4) {
        throw new Error('Options must be an array of exactly 4 choices');
    }
    
    if (!questionData.options.includes(questionData.correctAnswer)) {
        throw new Error('correctAnswer must be one of the provided options');
    }
    
    return true;
}

// ============================================
// CONTROLLER FUNCTIONS
// ============================================

/**
 * CREATE QUIZ
 * POST /api/quiz/create
 */
exports.createQuiz = async (req, res) => {
    try {
        const { topic, description, totalQuestions, passingScore } = req.body;
        
        // Validation
        if (!topic || !description) {
            return res.status(400).json({ 
                message: 'Topic and description are required' 
            });
        }
        
        if (totalQuestions < 5 || totalQuestions > 50) {
            return res.status(400).json({ 
                message: 'Total questions must be between 5 and 50' 
            });
        }
        
        if (passingScore < 50 || passingScore > 100) {
            return res.status(400).json({ 
                message: 'Passing score must be between 50 and 100' 
            });
        }
        
        const userDept = (req.user.department || 'General').toUpperCase();

        // Create quiz
        const newQuiz = new Quiz({
            topic: topic.trim(),
            description: description.trim(), 
            totalQuestions, 
            passingScore,
            createdBy: req.user.id,
            department: userDept,
            isActive: true // ENSURE IT'S ACTIVE
        });
        
        await newQuiz.save();
        
        console.log(`✅ NEW QUIZ CREATED:`, {
            id: newQuiz._id,
            topic: newQuiz.topic,
            department: newQuiz.department,
            isActive: newQuiz.isActive,
            createdBy: req.user.name
        });

        // Create shadow event for skill certificate
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
            console.log(`✅ Shadow event created: ${certName}`);
        }
        
        res.status(201).json({
            message: 'Quiz created successfully! Students can now see it.',
            quiz: {
                id: newQuiz._id,
                topic: newQuiz.topic,
                totalQuestions: newQuiz.totalQuestions,
                passingScore: newQuiz.passingScore
            }
        });
        
    } catch (error) {
        console.error('❌ Quiz Creation Error:', error);
        res.status(500).json({ 
            message: "Failed to create quiz: " + error.message 
        });
    }
};

/**
 * GET AVAILABLE QUIZZES
 * GET /api/quiz/list
 */
exports.getAvailableQuizzes = async (req, res) => {
    try {
        const dept = req.user.department 
            ? req.user.department.toUpperCase() 
            : 'GENERAL';
        
        console.log(`📚 Fetching quizzes for department: ${dept}`);
        
        // FIXED: More inclusive query - fetch ALL active quizzes
        // Department filter should be broad to show cross-department quizzes
        const query = { 
            isActive: true
            // REMOVED DEPARTMENT RESTRICTION - This was blocking new quizzes
        };
        
        console.log('🔍 Query:', JSON.stringify(query));
        
        const quizzes = await Quiz.find(query)
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 }); // Newest first

        console.log(`✅ Found ${quizzes.length} active quizzes`);

        // Check if student has already passed each quiz
        const quizzesWithStatus = await Promise.all(quizzes.map(async (quiz) => {
            const certName = `Certified: ${quiz.topic}`;
            const hasCert = await Certificate.findOne({ 
                eventName: certName, 
                studentEmail: req.user.email.toLowerCase() 
            });
            
            const quizData = {
                ...quiz.toObject(),
                hasPassed: !!hasCert,
                certificateId: hasCert ? hasCert.certificateId : null
            };
            
            console.log(`  📝 ${quiz.topic} - Passed: ${!!hasCert}`);
            
            return quizData;
        }));

        res.json(quizzesWithStatus);
        
    } catch (error) {
        console.error('Get Quizzes Error:', error);
        res.status(500).json({ 
            message: "Failed to fetch quizzes",
            error: error.message 
        });
    }
};


/**
 * GET QUIZ DETAILS
 * GET /api/quiz/:quizId/details
 */
exports.getQuizDetails = async (req, res) => {
    try {
        const { quizId } = req.params;
        const quiz = await Quiz.findById(quizId);
        
        if (!quiz) {
            return res.status(404).json({ message: "Quiz not found" });
        }

        // Check if student already passed
        const certName = `Certified: ${quiz.topic}`;
        const existingCert = await Certificate.findOne({ 
            eventName: certName, 
            studentEmail: req.user.email.toLowerCase() 
        });

        res.json({
            topic: quiz.topic,
            description: quiz.description,
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

/**
 * GET NEXT ADAPTIVE QUESTION
 * POST /api/quiz/next
 */
exports.nextQuestion = async (req, res) => {
    const { quizId, history } = req.body;

    try {
        // Validate quiz exists
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ message: "Quiz not found" });
        }

        const currentQIndex = history ? history.length : 0;
        
        // Determine difficulty based on performance
        let difficulty = 'Medium';
        const phase1Limit = Math.floor(quiz.totalQuestions * 0.33);

        if (currentQIndex < phase1Limit) {
            // First 33%: Easy questions
            difficulty = 'Easy';
        } else if (history && history.length >= 3) {
            // Adaptive based on last 3 answers
            const recent = history.slice(-3);
            const correctCount = recent.filter(h => h.isCorrect).length;
            
            if (correctCount === 3) difficulty = 'Hard';
            else if (correctCount >= 1) difficulty = 'Medium';
            else difficulty = 'Easy';
        }

        // Build context to avoid repetition
        const previousQuestionsText = history 
            ? history.map(h => h.questionText).slice(-5).join(" | ") 
            : "";

        // Craft AI prompt
        const prompt = `
You are an expert educational content creator. Generate ONE multiple-choice question about "${quiz.topic}".

Difficulty Level: ${difficulty}
Question Number: ${currentQIndex + 1}/${quiz.totalQuestions}

IMPORTANT CONSTRAINTS:
- DO NOT repeat concepts from these previous questions: [${previousQuestionsText}]
- The question must be ${difficulty} difficulty
- Focus on practical, real-world application of concepts
- Avoid trick questions; ensure clarity
- All four options should be plausible

REQUIRED OUTPUT FORMAT (JSON ONLY, NO MARKDOWN):
{
    "question": "Clear, concise question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Exact text of the correct option",
    "explanation": "Brief 1-2 sentence explanation of why this is correct"
}

Generate the question now:`.trim();

        // Use retry logic for AI generation
        const text = await generateQuestionWithRetry(prompt);
        
        // Parse and validate response
        const cleaned = cleanJSON(text);
        let questionData;
        
        try {
            questionData = JSON.parse(cleaned);
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
            console.error('Raw Response:', text);
            throw new Error('AI returned invalid JSON format');
        }
        
        // Validate structure
        validateQuestionData(questionData);
        
        // Add metadata
        questionData.difficulty = difficulty;
        questionData.questionNumber = currentQIndex + 1;
        
        res.json(questionData);

    } catch (error) {
        console.error("AI Generation Error:", error);
        
        // Categorize error for client
        const errorType = categorizeAIError(error);
        
        // Return user-friendly error
        res.status(500).json({ 
            message: getErrorMessage(errorType),
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            retryable: errorType !== 'QUOTA_EXCEEDED' && errorType !== 'INVALID_API_KEY'
        });
    }
};

/**
 * Get user-friendly error message
 */
function getErrorMessage(errorType) {
    const messages = {
        'QUOTA_EXCEEDED': 'AI service quota exceeded. Please try again later or contact support.',
        'INVALID_API_KEY': 'AI service configuration error. Please contact support.',
        'TIMEOUT': 'AI service timeout. Please try again.',
        'NETWORK_ERROR': 'Network connection error. Please check your connection and try again.',
        'UNKNOWN': 'AI service temporarily unavailable. Please try again.'
    };
    
    return messages[errorType] || messages['UNKNOWN'];
}

/**
 * SUBMIT QUIZ & MINT CERTIFICATE
 * POST /api/quiz/submit
 */
exports.submitQuiz = async (req, res) => {
    const { quizId, score } = req.body;
    const userId = req.user.id;

    try {
        // Validate inputs
        if (!quizId || score === undefined) {
            return res.status(400).json({ 
                message: 'Quiz ID and score are required' 
            });
        }
        
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found' });
        }
        
        const percentage = (score / quiz.totalQuestions) * 100;
        console.log(`📊 Quiz submission: ${req.user.email} scored ${percentage.toFixed(1)}% on ${quiz.topic}`);

        // Check if passed
        if (percentage < quiz.passingScore) {
            return res.json({ 
                passed: false, 
                score: percentage,
                requiredScore: quiz.passingScore,
                message: `Score: ${percentage.toFixed(1)}%. Required: ${quiz.passingScore}%. Try again!` 
            });
        }

        const student = await User.findById(userId);
        const certName = `Certified: ${quiz.topic}`;
        const normalizedEmail = student.email.toLowerCase();

        // Check for duplicate certificate
        const existingCert = await Certificate.findOne({ 
            eventName: certName, 
            studentEmail: normalizedEmail 
        });
        
        if (existingCert) {
            return res.json({ 
                passed: true,
                score: percentage,
                certificateId: existingCert.certificateId,
                message: "You already have this certificate!" 
            });
        }

        // Mint NFT if wallet connected
        let txHash = "PENDING";
        let tokenId = "PENDING";
        
        if (student.walletAddress) {
            try {
                console.log(`⛓️ Minting NFT for ${student.name}...`);
                const hashData = normalizedEmail + new Date() + certName;
                const certHash = crypto.createHash('sha256')
                    .update(hashData)
                    .digest('hex');
                const mintResult = await mintNFT(student.walletAddress, certHash);
                txHash = mintResult.transactionHash;
                tokenId = mintResult.tokenId.toString();
                console.log(`✅ NFT minted: Token #${tokenId}`);
            } catch (mintError) { 
                console.error("NFT minting failed (non-critical):", mintError.message);
                // Continue with certificate creation even if minting fails
            }
        } else {
            console.warn(`⚠️ Student ${student.name} has no wallet connected`);
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
        console.log(`✅ Certificate created: ${certId}`);
        
        // Send email notification (non-blocking)
        sendCertificateIssued(normalizedEmail, student.name, certName, certId)
            .catch(err => console.error('Email notification failed:', err.message));

        res.json({ 
            passed: true, 
            certificateId: certId, 
            score: percentage,
            tokenId: tokenId !== "PENDING" ? tokenId : null,
            message: "Congratulations! Quiz passed and certificate issued." 
        });

    } catch (error) {
        console.error('Submit Quiz Error:', error);
        res.status(500).json({ 
            message: "Error submitting quiz: " + error.message 
        });
    }
};