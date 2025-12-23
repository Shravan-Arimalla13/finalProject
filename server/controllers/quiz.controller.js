// // server/controllers/quiz.controller.js - FIXED AI GENERATION
// const { GoogleGenerativeAI } = require("@google/generative-ai");
// const Quiz = require('../models/quiz.model');
// const Certificate = require('../models/certificate.model');
// const Event = require('../models/event.model');
// const User = require('../models/user.model');
// const { nanoid } = require('nanoid');
// const crypto = require('crypto');
// const { mintNFT } = require('../utils/blockchain');
// const { sendCertificateIssued } = require('../utils/mailer');

// // 🔥 CRITICAL FIX: Use gemini-1.5-flash (FREE tier with 15 RPM)
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const MODEL_NAME = "gemini-1.5-flash";

// // AI Configuration - Optimized for free tier
// const AI_CONFIG = {
//     maxRetries: 2,
//     timeoutMs: 12000, // 12 seconds
//     temperature: 0.8,
//     maxOutputTokens: 400,
//     retryDelayMs: 3000 // 3 second delay between retries
// };

// /**
//  * Clean AI JSON response
//  */
// const cleanJSON = (text) => {
//     if (!text) return "";
//     return text.replace(/```json/g, '').replace(/```/g, '').trim();
// };

// /**
//  * Validate question structure
//  */
// function validateQuestionData(questionData) {
//     const required = ['question', 'options', 'correctAnswer', 'explanation'];
    
//     for (const field of required) {
//         if (!questionData[field]) {
//             throw new Error(`Missing required field: ${field}`);
//         }
//     }
    
//     if (!Array.isArray(questionData.options) || questionData.options.length !== 4) {
//         throw new Error('Options must be an array of exactly 4 choices');
//     }
    
//     if (!questionData.options.includes(questionData.correctAnswer)) {
//         throw new Error('correctAnswer must be one of the provided options');
//     }
    
//     return true;
// }

// /**
//  * Generate AI question with retry logic - OPTIMIZED FOR FREE TIER
//  */
// async function generateQuestionWithRetry(prompt, maxRetries = AI_CONFIG.maxRetries) {
//     let lastError = null;
    
//     for (let attempt = 1; attempt <= maxRetries; attempt++) {
//         try {
//             console.log(`🤖 AI Generation Attempt ${attempt}/${maxRetries} using ${MODEL_NAME}`);
            
//             const model = genAI.getGenerativeModel({ 
//                 model: MODEL_NAME,
//                 generationConfig: {
//                     temperature: AI_CONFIG.temperature,
//                     maxOutputTokens: AI_CONFIG.maxOutputTokens,
//                     topP: 0.95,
//                     topK: 40
//                 }
//             });
            
//             // Create timeout wrapper
//             const timeoutPromise = new Promise((_, reject) => {
//                 setTimeout(() => reject(new Error('AI request timeout')), AI_CONFIG.timeoutMs);
//             });
            
//             const generationPromise = model.generateContent(prompt);
            
//             // Race between generation and timeout
//             const result = await Promise.race([generationPromise, timeoutPromise]);
//             const response = await result.response;
//             const text = response.text();
            
//             // Validate response
//             if (!text || text.length < 50) {
//                 throw new Error('AI response too short or empty');
//             }
            
//             console.log(`✅ AI generated question successfully (${text.length} chars)`);
//             return text;
            
//         } catch (error) {
//             lastError = error;
//             const errorMsg = error.message.toLowerCase();
            
//             console.error(`❌ AI Generation Attempt ${attempt} Failed:`, error.message);
            
//             // Check for quota/rate limit errors
//             if (errorMsg.includes('quota') || 
//                 errorMsg.includes('429') || 
//                 errorMsg.includes('rate limit') ||
//                 errorMsg.includes('resource exhausted')) {
                
//                 console.error('⚠️ Rate limit hit - waiting before retry...');
                
//                 // If not last attempt, wait longer
//                 if (attempt < maxRetries) {
//                     const waitTime = AI_CONFIG.retryDelayMs * attempt; // 3s, 6s
//                     console.log(`⏳ Waiting ${waitTime/1000}s before retry...`);
//                     await new Promise(resolve => setTimeout(resolve, waitTime));
//                     continue;
//                 } else {
//                     throw new Error('QUOTA_EXCEEDED');
//                 }
//             }
            
//             // Check for authentication errors
//             if (errorMsg.includes('api key') || errorMsg.includes('authentication')) {
//                 throw new Error('INVALID_API_KEY');
//             }
            
//             // For network errors, retry with backoff
//             if (errorMsg.includes('timeout') || errorMsg.includes('network')) {
//                 if (attempt < maxRetries) {
//                     const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s
//                     console.log(`⏳ Retrying in ${waitTime/1000}s...`);
//                     await new Promise(resolve => setTimeout(resolve, waitTime));
//                     continue;
//                 }
//             }
            
//             // For other errors, fail immediately
//             throw error;
//         }
//     }
    
//     // All attempts exhausted
//     throw lastError;
// }

// /**
//  * GET NEXT ADAPTIVE QUESTION
//  * POST /api/quiz/next
//  */
// exports.nextQuestion = async (req, res) => {
//     const { quizId, history } = req.body;

//     try {
//         // Validate quiz exists
//         const quiz = await Quiz.findById(quizId);
//         if (!quiz) {
//             return res.status(404).json({ message: "Quiz not found" });
//         }

//         const currentQIndex = history ? history.length : 0;
        
//         // Determine difficulty based on performance
//         let difficulty = 'Medium';
//         const phase1Limit = Math.floor(quiz.totalQuestions * 0.33);

//         if (currentQIndex < phase1Limit) {
//             difficulty = 'Easy';
//         } else if (history && history.length >= 3) {
//             const recent = history.slice(-3);
//             const correctCount = recent.filter(h => h.isCorrect).length;
            
//             if (correctCount === 3) difficulty = 'Hard';
//             else if (correctCount >= 1) difficulty = 'Medium';
//             else difficulty = 'Easy';
//         }

//         // Build context to avoid repetition
//         const previousQuestionsText = history 
//             ? history.map(h => h.questionText).slice(-5).join(" | ") 
//             : "";

//         // 🔥 OPTIMIZED PROMPT FOR FASTER GENERATION
//         const prompt = `Generate ONE ${difficulty} multiple-choice question about "${quiz.topic}".

// ${previousQuestionsText ? `Avoid repeating: ${previousQuestionsText}` : ''}

// Return ONLY valid JSON:
// {
//   "question": "Your question here",
//   "options": ["A", "B", "C", "D"],
//   "correctAnswer": "The correct option text",
//   "explanation": "Brief explanation why"
// }`;

//         console.log(`📝 Generating ${difficulty} question ${currentQIndex + 1}/${quiz.totalQuestions}`);

//         // Try AI generation
//         const text = await generateQuestionWithRetry(prompt);
        
//         // Parse and validate response
//         const cleaned = cleanJSON(text);
//         let questionData;
        
//         try {
//             questionData = JSON.parse(cleaned);
//         } catch (parseError) {
//             console.error('JSON Parse Error:', parseError);
//             console.error('Raw Response:', text);
//             throw new Error('AI returned invalid JSON format');
//         }
        
//         // Validate structure
//         validateQuestionData(questionData);
        
//         // Add metadata
//         questionData.difficulty = difficulty;
//         questionData.questionNumber = currentQIndex + 1;
        
//         console.log(`✅ Question generated: "${questionData.question.substring(0, 50)}..."`);
        
//         res.json(questionData);

//     } catch (error) {
//         console.error("❌ Question Generation Error:", error.message);
        
//         // Provide user-friendly error message
//         if (error.message === 'QUOTA_EXCEEDED') {
//             res.status(503).json({ 
//                 message: 'AI service temporarily unavailable due to high demand. Please wait 30 seconds and try again.',
//                 retryable: true,
//                 retryAfter: 30
//             });
//         } else if (error.message === 'INVALID_API_KEY') {
//             res.status(500).json({ 
//                 message: 'AI service configuration error. Please contact support.',
//                 retryable: false
//             });
//         } else {
//             res.status(500).json({ 
//                 message: 'Failed to generate question. Please try again.',
//                 retryable: true,
//                 error: process.env.NODE_ENV === 'development' ? error.message : undefined
//             });
//         }
//     }
// };

// // ============================================
// // CREATE QUIZ (unchanged from before)
// // ============================================
// exports.createQuiz = async (req, res) => {
//     try {
//         const { topic, description, totalQuestions, passingScore } = req.body;
        
//         if (!topic || !description) {
//             return res.status(400).json({ message: 'Topic and description are required' });
//         }
        
//         if (totalQuestions < 5 || totalQuestions > 50) {
//             return res.status(400).json({ message: 'Total questions must be between 5 and 50' });
//         }
        
//         if (passingScore < 50 || passingScore > 100) {
//             return res.status(400).json({ message: 'Passing score must be between 50 and 100' });
//         }
        
//         const userDept = (req.user.department || 'General').toUpperCase();

//         const newQuiz = new Quiz({
//             topic: topic.trim(),
//             description: description.trim(), 
//             totalQuestions, 
//             passingScore,
//             createdBy: req.user.id,
//             department: userDept,
//             isActive: true
//         });
        
//         await newQuiz.save();
        
//         console.log(`✅ NEW QUIZ CREATED: ${newQuiz.topic} by ${req.user.name}`);

//         // Create shadow event for skill certificate
//         const certName = `Certified: ${topic.trim()}`;
//         const existingEvent = await Event.findOne({ name: certName });
        
//         if (!existingEvent) {
//             await Event.create({
//                 name: certName,
//                 date: new Date(),
//                 description: `Skill Assessment for ${topic}`,
//                 createdBy: req.user.id,
//                 department: userDept,
//                 isPublic: false,
//                 certificatesIssued: true,
//                 startTime: "00:00",
//                 endTime: "23:59",
//                 certificateConfig: {
//                     collegeName: "K. S. Institute of Technology",
//                     headerDepartment: `DEPARTMENT OF ${userDept}`,
//                     certificateTitle: "CERTIFICATE OF SKILL",
//                     eventType: "Skill Assessment",
//                     customSignatureText: "Examination Authority"
//                 }
//             });
//         }
        
//         res.status(201).json({
//             message: 'Quiz created successfully! Students can now access it.',
//             quiz: {
//                 id: newQuiz._id,
//                 topic: newQuiz.topic
//             }
//         });
        
//     } catch (error) {
//         console.error('Quiz Creation Error:', error);
//         res.status(500).json({ message: "Failed to create quiz: " + error.message });
//     }
// };

// // [Rest of functions: getAvailableQuizzes, getQuizDetails, submitQuiz remain the same]
// // ============================================
// // CONTROLLER FUNCTIONS
// // ============================================

// /**
//  * CREATE QUIZ
//  * POST /api/quiz/create
//  */
// exports.createQuiz = async (req, res) => {
//     try {
//         const { topic, description, totalQuestions, passingScore } = req.body;
        
//         // Validation
//         if (!topic || !description) {
//             return res.status(400).json({ 
//                 message: 'Topic and description are required' 
//             });
//         }
        
//         if (totalQuestions < 5 || totalQuestions > 50) {
//             return res.status(400).json({ 
//                 message: 'Total questions must be between 5 and 50' 
//             });
//         }
        
//         if (passingScore < 50 || passingScore > 100) {
//             return res.status(400).json({ 
//                 message: 'Passing score must be between 50 and 100' 
//             });
//         }
        
//         const userDept = (req.user.department || 'General').toUpperCase();

//         // Create quiz
//         const newQuiz = new Quiz({
//             topic: topic.trim(),
//             description: description.trim(), 
//             totalQuestions, 
//             passingScore,
//             createdBy: req.user.id,
//             department: userDept,
//             isActive: true // ENSURE IT'S ACTIVE
//         });
        
//         await newQuiz.save();
        
//         console.log(`✅ NEW QUIZ CREATED:`, {
//             id: newQuiz._id,
//             topic: newQuiz.topic,
//             department: newQuiz.department,
//             isActive: newQuiz.isActive,
//             createdBy: req.user.name
//         });

//         // Create shadow event for skill certificate
//         const certName = `Certified: ${topic.trim()}`;
//         const existingEvent = await Event.findOne({ name: certName });
        
//         if (!existingEvent) {
//             await Event.create({
//                 name: certName,
//                 date: new Date(),
//                 description: `Skill Assessment for ${topic}`,
//                 createdBy: req.user.id,
//                 department: userDept,
//                 isPublic: false,
//                 certificatesIssued: true,
//                 startTime: "00:00",
//                 endTime: "23:59",
//                 certificateConfig: {
//                     collegeName: "K. S. Institute of Technology",
//                     headerDepartment: `DEPARTMENT OF ${userDept}`,
//                     certificateTitle: "CERTIFICATE OF SKILL",
//                     eventType: "Skill Assessment",
//                     customSignatureText: "Examination Authority"
//                 }
//             });
//             console.log(`✅ Shadow event created: ${certName}`);
//         }
        
//         res.status(201).json({
//             message: 'Quiz created successfully! Students can now see it.',
//             quiz: {
//                 id: newQuiz._id,
//                 topic: newQuiz.topic,
//                 totalQuestions: newQuiz.totalQuestions,
//                 passingScore: newQuiz.passingScore
//             }
//         });
        
//     } catch (error) {
//         console.error('❌ Quiz Creation Error:', error);
//         res.status(500).json({ 
//             message: "Failed to create quiz: " + error.message 
//         });
//     }
// };

// /**
//  * GET AVAILABLE QUIZZES
//  * GET /api/quiz/list
//  */
// exports.getAvailableQuizzes = async (req, res) => {
//     try {
//         const dept = req.user.department 
//             ? req.user.department.toUpperCase() 
//             : 'GENERAL';
        
//         console.log(`📚 Fetching quizzes for department: ${dept}`);
        
//         // FIXED: More inclusive query - fetch ALL active quizzes
//         // Department filter should be broad to show cross-department quizzes
//         const query = { 
//             isActive: true
//             // REMOVED DEPARTMENT RESTRICTION - This was blocking new quizzes
//         };
        
//         console.log('🔍 Query:', JSON.stringify(query));
        
//         const quizzes = await Quiz.find(query)
//             .populate('createdBy', 'name')
//             .sort({ createdAt: -1 }); // Newest first

//         console.log(`✅ Found ${quizzes.length} active quizzes`);

//         // Check if student has already passed each quiz
//         const quizzesWithStatus = await Promise.all(quizzes.map(async (quiz) => {
//             const certName = `Certified: ${quiz.topic}`;
//             const hasCert = await Certificate.findOne({ 
//                 eventName: certName, 
//                 studentEmail: req.user.email.toLowerCase() 
//             });
            
//             const quizData = {
//                 ...quiz.toObject(),
//                 hasPassed: !!hasCert,
//                 certificateId: hasCert ? hasCert.certificateId : null
//             };
            
//             console.log(`  📝 ${quiz.topic} - Passed: ${!!hasCert}`);
            
//             return quizData;
//         }));

//         res.json(quizzesWithStatus);
        
//     } catch (error) {
//         console.error('Get Quizzes Error:', error);
//         res.status(500).json({ 
//             message: "Failed to fetch quizzes",
//             error: error.message 
//         });
//     }
// };


// /**
//  * GET QUIZ DETAILS
//  * GET /api/quiz/:quizId/details
//  */
// exports.getQuizDetails = async (req, res) => {
//     try {
//         const { quizId } = req.params;
//         const quiz = await Quiz.findById(quizId);
        
//         if (!quiz) {
//             return res.status(404).json({ message: "Quiz not found" });
//         }

//         // Check if student already passed
//         const certName = `Certified: ${quiz.topic}`;
//         const existingCert = await Certificate.findOne({ 
//             eventName: certName, 
//             studentEmail: req.user.email.toLowerCase() 
//         });

//         res.json({
//             topic: quiz.topic,
//             description: quiz.description,
//             totalQuestions: quiz.totalQuestions,
//             passingScore: quiz.passingScore,
//             hasPassed: !!existingCert,
//             certificateId: existingCert?.certificateId
//         });
        
//     } catch (error) {
//         console.error('Get Quiz Details Error:', error);
//         res.status(500).json({ message: "Server Error" });
//     }
// };

// /**
//  * GET NEXT ADAPTIVE QUESTION
//  * POST /api/quiz/next
//  */
// exports.nextQuestion = async (req, res) => {
//     const { quizId, history } = req.body;

//     try {
//         // Validate quiz exists
//         const quiz = await Quiz.findById(quizId);
//         if (!quiz) {
//             return res.status(404).json({ message: "Quiz not found" });
//         }

//         const currentQIndex = history ? history.length : 0;
        
//         // Determine difficulty based on performance
//         let difficulty = 'Medium';
//         const phase1Limit = Math.floor(quiz.totalQuestions * 0.33);

//         if (currentQIndex < phase1Limit) {
//             // First 33%: Easy questions
//             difficulty = 'Easy';
//         } else if (history && history.length >= 3) {
//             // Adaptive based on last 3 answers
//             const recent = history.slice(-3);
//             const correctCount = recent.filter(h => h.isCorrect).length;
            
//             if (correctCount === 3) difficulty = 'Hard';
//             else if (correctCount >= 1) difficulty = 'Medium';
//             else difficulty = 'Easy';
//         }

//         // Build context to avoid repetition
//         const previousQuestionsText = history 
//             ? history.map(h => h.questionText).slice(-5).join(" | ") 
//             : "";

//         // Craft AI prompt
//         const prompt = `
// You are an expert educational content creator. Generate ONE multiple-choice question about "${quiz.topic}".

// Difficulty Level: ${difficulty}
// Question Number: ${currentQIndex + 1}/${quiz.totalQuestions}

// IMPORTANT CONSTRAINTS:
// - DO NOT repeat concepts from these previous questions: [${previousQuestionsText}]
// - The question must be ${difficulty} difficulty
// - Focus on practical, real-world application of concepts
// - Avoid trick questions; ensure clarity
// - All four options should be plausible

// REQUIRED OUTPUT FORMAT (JSON ONLY, NO MARKDOWN):
// {
//     "question": "Clear, concise question text",
//     "options": ["Option A", "Option B", "Option C", "Option D"],
//     "correctAnswer": "Exact text of the correct option",
//     "explanation": "Brief 1-2 sentence explanation of why this is correct"
// }

// Generate the question now:`.trim();

//         // Use retry logic for AI generation
//         const text = await generateQuestionWithRetry(prompt);
        
//         // Parse and validate response
//         const cleaned = cleanJSON(text);
//         let questionData;
        
//         try {
//             questionData = JSON.parse(cleaned);
//         } catch (parseError) {
//             console.error('JSON Parse Error:', parseError);
//             console.error('Raw Response:', text);
//             throw new Error('AI returned invalid JSON format');
//         }
        
//         // Validate structure
//         validateQuestionData(questionData);
        
//         // Add metadata
//         questionData.difficulty = difficulty;
//         questionData.questionNumber = currentQIndex + 1;
        
//         res.json(questionData);

//     } catch (error) {
//         console.error("AI Generation Error:", error);
        
//         // Categorize error for client
//         const errorType = categorizeAIError(error);
        
//         // Return user-friendly error
//         res.status(500).json({ 
//             message: getErrorMessage(errorType),
//             details: process.env.NODE_ENV === 'development' ? error.message : undefined,
//             retryable: errorType !== 'QUOTA_EXCEEDED' && errorType !== 'INVALID_API_KEY'
//         });
//     }
// };

// /**
//  * Get user-friendly error message
//  */
// function getErrorMessage(errorType) {
//     const messages = {
//         'QUOTA_EXCEEDED': 'AI service quota exceeded. Please try again later or contact support.',
//         'INVALID_API_KEY': 'AI service configuration error. Please contact support.',
//         'TIMEOUT': 'AI service timeout. Please try again.',
//         'NETWORK_ERROR': 'Network connection error. Please check your connection and try again.',
//         'UNKNOWN': 'AI service temporarily unavailable. Please try again.'
//     };
    
//     return messages[errorType] || messages['UNKNOWN'];
// }

// /**
//  * SUBMIT QUIZ & MINT CERTIFICATE
//  * POST /api/quiz/submit
//  */
// exports.submitQuiz = async (req, res) => {
//     const { quizId, score } = req.body;
//     const userId = req.user.id;

//     try {
//         // Validate inputs
//         if (!quizId || score === undefined) {
//             return res.status(400).json({ 
//                 message: 'Quiz ID and score are required' 
//             });
//         }
        
//         const quiz = await Quiz.findById(quizId);
//         if (!quiz) {
//             return res.status(404).json({ message: 'Quiz not found' });
//         }
        
//         const percentage = (score / quiz.totalQuestions) * 100;
//         console.log(`📊 Quiz submission: ${req.user.email} scored ${percentage.toFixed(1)}% on ${quiz.topic}`);

//         // Check if passed
//         if (percentage < quiz.passingScore) {
//             return res.json({ 
//                 passed: false, 
//                 score: percentage,
//                 requiredScore: quiz.passingScore,
//                 message: `Score: ${percentage.toFixed(1)}%. Required: ${quiz.passingScore}%. Try again!` 
//             });
//         }

//         const student = await User.findById(userId);
//         const certName = `Certified: ${quiz.topic}`;
//         const normalizedEmail = student.email.toLowerCase();

//         // Check for duplicate certificate
//         const existingCert = await Certificate.findOne({ 
//             eventName: certName, 
//             studentEmail: normalizedEmail 
//         });
        
//         if (existingCert) {
//             return res.json({ 
//                 passed: true,
//                 score: percentage,
//                 certificateId: existingCert.certificateId,
//                 message: "You already have this certificate!" 
//             });
//         }

//         // Mint NFT if wallet connected
//         let txHash = "PENDING";
//         let tokenId = "PENDING";
        
//         if (student.walletAddress) {
//             try {
//                 console.log(`⛓️ Minting NFT for ${student.name}...`);
//                 const hashData = normalizedEmail + new Date() + certName;
//                 const certHash = crypto.createHash('sha256')
//                     .update(hashData)
//                     .digest('hex');
//                 const mintResult = await mintNFT(student.walletAddress, certHash);
//                 txHash = mintResult.transactionHash;
//                 tokenId = mintResult.tokenId.toString();
//                 console.log(`✅ NFT minted: Token #${tokenId}`);
//             } catch (mintError) { 
//                 console.error("NFT minting failed (non-critical):", mintError.message);
//                 // Continue with certificate creation even if minting fails
//             }
//         } else {
//             console.warn(`⚠️ Student ${student.name} has no wallet connected`);
//         }

//         // Create certificate
//         const certId = `SKILL-${nanoid(8)}`;
//         const newCert = new Certificate({
//             certificateId: certId,
//             tokenId,
//             certificateHash: txHash,
//             transactionHash: txHash,
//             studentName: student.name,
//             studentEmail: normalizedEmail,
//             eventName: certName,
//             eventDate: new Date(),
//             issuedBy: userId,
//             verificationUrl: `/verify/${certId}`
//         });
        
//         await newCert.save();
//         console.log(`✅ Certificate created: ${certId}`);
        
//         // Send email notification (non-blocking)
//         sendCertificateIssued(normalizedEmail, student.name, certName, certId)
//             .catch(err => console.error('Email notification failed:', err.message));

//         res.json({ 
//             passed: true, 
//             certificateId: certId, 
//             score: percentage,
//             tokenId: tokenId !== "PENDING" ? tokenId : null,
//             message: "Congratulations! Quiz passed and certificate issued." 
//         });

//     } catch (error) {
//         console.error('Submit Quiz Error:', error);
//         res.status(500).json({ 
//             message: "Error submitting quiz: " + error.message 
//         });
//     }
// };

// server/controllers/quiz.controller.js - ULTIMATE FIX
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Quiz = require('../models/quiz.model');
const Certificate = require('../models/certificate.model');
const Event = require('../models/event.model');
const User = require('../models/user.model');
const { nanoid } = require('nanoid');
const crypto = require('crypto');
const { mintNFT } = require('../utils/blockchain');
const { sendCertificateIssued } = require('../utils/mailer');

// 🔥 CRITICAL: Validate API Key on Startup
if (!process.env.GEMINI_API_KEY) {
    console.error('❌ FATAL: GEMINI_API_KEY not found in environment variables');
    console.error('   Quiz generation will fail. Add GEMINI_API_KEY to your .env file');
    process.exit(1);
}

console.log('✅ Gemini API Key detected:', process.env.GEMINI_API_KEY.substring(0, 10) + '...');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_NAME = "gemini-1.5-flash"; // FREE tier model

// AI Configuration - Optimized for reliability
const AI_CONFIG = {
    maxRetries: 3,              // Increased from 2
    timeoutMs: 20000,           // 20 seconds (increased from 12)
    temperature: 0.8,
    maxOutputTokens: 500,       // Increased from 400
    retryDelayMs: 2000          // 2 second delay between retries
};

/**
 * Clean AI JSON response
 */
const cleanJSON = (text) => {
    if (!text) return "";
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

/**
 * Validate question structure
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

/**
 * Generate AI question with retry logic - IMPROVED
 */
async function generateQuestionWithRetry(prompt, maxRetries = AI_CONFIG.maxRetries) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🤖 AI Generation Attempt ${attempt}/${maxRetries} using ${MODEL_NAME}`);
            
            const model = genAI.getGenerativeModel({ 
                model: MODEL_NAME,
                generationConfig: {
                    temperature: AI_CONFIG.temperature,
                    maxOutputTokens: AI_CONFIG.maxOutputTokens,
                    topP: 0.95,
                    topK: 40
                }
            });
            
            // Create timeout wrapper
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
            
            console.log(`✅ AI generated question successfully (${text.length} chars)`);
            console.log('📝 Raw AI Response:', text.substring(0, 200) + '...');
            
            return text;
            
        } catch (error) {
            lastError = error;
            const errorMsg = error.message.toLowerCase();
            
            console.error(`❌ AI Generation Attempt ${attempt} Failed:`, error.message);
            
            // Check for quota/rate limit errors
            if (errorMsg.includes('quota') || 
                errorMsg.includes('429') || 
                errorMsg.includes('rate limit') ||
                errorMsg.includes('resource exhausted')) {
                
                console.error('⚠️ Rate limit hit - waiting before retry...');
                
                if (attempt < maxRetries) {
                    const waitTime = AI_CONFIG.retryDelayMs * attempt * 2; // 4s, 8s, 12s
                    console.log(`⏳ Waiting ${waitTime/1000}s before retry...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                } else {
                    throw new Error('QUOTA_EXCEEDED');
                }
            }
            
            // Check for authentication errors
            if (errorMsg.includes('api key') || errorMsg.includes('authentication') || errorMsg.includes('401')) {
                console.error('🔑 API Key Error - Check your GEMINI_API_KEY');
                throw new Error('INVALID_API_KEY');
            }
            
            // For network errors, retry with backoff
            if (errorMsg.includes('timeout') || errorMsg.includes('network') || errorMsg.includes('econnrefused')) {
                if (attempt < maxRetries) {
                    const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
                    console.log(`⏳ Network error, retrying in ${waitTime/1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                }
            }
            
            // For other errors, fail immediately on last attempt
            if (attempt === maxRetries) {
                throw error;
            }
        }
    }
    
    // All attempts exhausted
    throw lastError || new Error('Unknown error during AI generation');
}

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
            difficulty = 'Easy';
        } else if (history && history.length >= 3) {
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

        // 🔥 OPTIMIZED PROMPT FOR FASTER GENERATION
        const prompt = `Generate ONE ${difficulty} multiple-choice question about "${quiz.topic}".

${previousQuestionsText ? `AVOID repeating these concepts: ${previousQuestionsText}` : ''}

Return ONLY valid JSON (no markdown, no backticks):
{
  "question": "Your question here",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "The exact text of correct option",
  "explanation": "Brief explanation why"
}`;

        console.log(`📝 Generating ${difficulty} question ${currentQIndex + 1}/${quiz.totalQuestions}`);
        console.log('📋 Prompt:', prompt.substring(0, 150) + '...');

        // Try AI generation
        const text = await generateQuestionWithRetry(prompt);
        
        // Parse and validate response
        const cleaned = cleanJSON(text);
        let questionData;
        
        try {
            questionData = JSON.parse(cleaned);
        } catch (parseError) {
            console.error('❌ JSON Parse Error:', parseError);
            console.error('📄 Raw Response:', text);
            console.error('🧹 Cleaned Response:', cleaned);
            throw new Error('AI returned invalid JSON format');
        }
        
        // Validate structure
        validateQuestionData(questionData);
        
        // Add metadata
        questionData.difficulty = difficulty;
        questionData.questionNumber = currentQIndex + 1;
        
        console.log(`✅ Question generated: "${questionData.question.substring(0, 50)}..."`);
        
        res.json(questionData);

    } catch (error) {
        console.error("❌ Question Generation Error:", error.message);
        console.error("🔍 Full Error:", error);
        
        // Provide user-friendly error message
        if (error.message === 'QUOTA_EXCEEDED') {
            res.status(503).json({ 
                message: 'AI service temporarily unavailable due to high demand. Please wait 60 seconds and try again.',
                retryable: true,
                retryAfter: 60
            });
        } else if (error.message === 'INVALID_API_KEY') {
            res.status(500).json({ 
                message: 'AI service configuration error. Please contact your administrator.',
                retryable: false,
                hint: 'Check GEMINI_API_KEY in environment variables'
            });
        } else {
            res.status(500).json({ 
                message: 'Failed to generate question. Please try again.',
                retryable: true,
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
};

// ============================================
// CREATE QUIZ
// ============================================
exports.createQuiz = async (req, res) => {
    try {
        const { topic, description, totalQuestions, passingScore } = req.body;
        
        if (!topic || !description) {
            return res.status(400).json({ message: 'Topic and description are required' });
        }
        
        if (totalQuestions < 5 || totalQuestions > 50) {
            return res.status(400).json({ message: 'Total questions must be between 5 and 50' });
        }
        
        if (passingScore < 50 || passingScore > 100) {
            return res.status(400).json({ message: 'Passing score must be between 50 and 100' });
        }
        
        const userDept = (req.user.department || 'General').toUpperCase();

        const newQuiz = new Quiz({
            topic: topic.trim(),
            description: description.trim(), 
            totalQuestions, 
            passingScore,
            createdBy: req.user.id,
            department: userDept,
            isActive: true
        });
        
        await newQuiz.save();
        
        console.log(`✅ NEW QUIZ CREATED:`, {
            id: newQuiz._id,
            topic: newQuiz.topic,
            department: newQuiz.department,
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
        }
        
        res.status(201).json({
            message: 'Quiz created successfully! Students can now access it.',
            quiz: {
                id: newQuiz._id,
                topic: newQuiz.topic
            }
        });
        
    } catch (error) {
        console.error('Quiz Creation Error:', error);
        res.status(500).json({ message: "Failed to create quiz: " + error.message });
    }
};

// ============================================
// GET AVAILABLE QUIZZES - FIXED
// ============================================
exports.getAvailableQuizzes = async (req, res) => {
    try {
        const dept = req.user.department 
            ? req.user.department.toUpperCase() 
            : 'GENERAL';
        
        console.log(`📚 Fetching quizzes for user: ${req.user.email}, dept: ${dept}`);
        
        // Fetch ALL active quizzes (no department filter to show cross-department quizzes)
        const query = { isActive: true };
        
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
            
            return {
                ...quiz.toObject(),
                hasPassed: !!hasCert,
                certificateId: hasCert ? hasCert.certificateId : null
            };
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

// [Other functions remain the same: getQuizDetails, submitQuiz]
exports.getQuizDetails = async (req, res) => {
    try {
        const { quizId } = req.params;
        const quiz = await Quiz.findById(quizId);
        
        if (!quiz) {
            return res.status(404).json({ message: "Quiz not found" });
        }

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

exports.submitQuiz = async (req, res) => {
    const { quizId, score } = req.body;
    const userId = req.user.id;

    try {
        if (!quizId || score === undefined) {
            return res.status(400).json({ message: 'Quiz ID and score are required' });
        }
        
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found' });
        }
        
        const percentage = (score / quiz.totalQuestions) * 100;

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

        let txHash = "PENDING";
        let tokenId = "PENDING";
        
        if (student.walletAddress) {
            try {
                const hashData = normalizedEmail + new Date() + certName;
                const certHash = crypto.createHash('sha256').update(hashData).digest('hex');
                const mintResult = await mintNFT(student.walletAddress, certHash);
                txHash = mintResult.transactionHash;
                tokenId = mintResult.tokenId.toString();
            } catch (mintError) { 
                console.error("NFT minting failed:", mintError.message);
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
        res.status(500).json({ message: "Error submitting quiz: " + error.message });
    }
};