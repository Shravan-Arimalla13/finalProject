// server/controllers/quiz.controller.js - COMPLETE FIX
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

// --- IMPROVED: Similarity checker with better algorithm ---
function calculateSimilarity(str1, str2) {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    // Check for exact match
    if (s1 === s2) return 1.0;
    
    // Check for substring containment
    if (s1.includes(s2) || s2.includes(s1)) return 0.9;
    
    // Levenshtein distance
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

// --- IMPROVED: Better fallback system ---
function getFallbackQuestion(topic, difficulty, index, previousQuestions = []) {
    const fallbacks = [
        {
            question: `What is a fundamental concept in ${topic}?`,
            options: ["Core principles", "Random facts", "Unrelated topics", "Historical dates"],
            correctAnswer: "Core principles",
            explanation: "Understanding fundamental concepts is essential in any field of study."
        },
        {
            question: `Which skill is most important for mastering ${topic}?`,
            options: ["Problem-solving", "Memorization only", "Avoiding practice", "Guessing"],
            correctAnswer: "Problem-solving",
            explanation: "Problem-solving abilities are crucial for practical application."
        },
        {
            question: `How does ${topic} apply to real-world scenarios?`,
            options: ["Through practical implementation", "It has no applications", "Only in theory", "By avoiding use"],
            correctAnswer: "Through practical implementation",
            explanation: "Real-world application demonstrates the value of theoretical knowledge."
        },
        {
            question: `What approach works best when learning ${topic}?`,
            options: ["Hands-on practice", "Reading alone", "Avoiding challenges", "Skipping basics"],
            correctAnswer: "Hands-on practice",
            explanation: "Active learning through practice is more effective than passive consumption."
        },
        {
            question: `Why is understanding ${topic} valuable?`,
            options: ["Builds foundational knowledge", "No real value", "Only for exams", "Just a requirement"],
            correctAnswer: "Builds foundational knowledge",
            explanation: "Strong foundations enable advanced learning and application."
        }
    ];
    
    // Select unique fallback
    const selected = fallbacks[index % fallbacks.length];
    selected.difficulty = difficulty;
    return selected;
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

// --- 4. NEXT QUESTION - MAJOR FIX: Better Uniqueness + Retry Logic ---
exports.nextQuestion = async (req, res) => {
    const { quizId, history } = req.body;

    try {
        const quiz = await Quiz.findById(quizId);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        const currentQIndex = history ? history.length : 0;
        
        // ✅ FIX: Strict boundary check
        if (currentQIndex >= quiz.totalQuestions) {
            return res.status(400).json({ 
                message: "Quiz complete", 
                shouldEnd: true 
            });
        }

        // Difficulty progression
        let difficulty = 'Easy';
        if (currentQIndex >= Math.floor(quiz.totalQuestions * 0.7)) difficulty = 'Hard';
        else if (currentQIndex >= Math.floor(quiz.totalQuestions * 0.3)) difficulty = 'Medium';
        
        // Extract previous questions for anti-repetition
        const previousQuestions = history ? history.map(h => h.questionText.toLowerCase()) : [];
        
        // ✅ FIX: Enhanced prompt with stronger anti-repetition
        const prompt = `Generate ONE unique multiple-choice question about "${quiz.topic}".

CRITICAL ANTI-REPETITION RULES:
- Do NOT reuse ANY of these previous questions:
${previousQuestions.length > 0 ? previousQuestions.map((q, i) => `${i+1}. ${q}`).join('\n') : 'None yet'}

- The new question MUST be completely different in:
  * Topic focus
  * Question wording
  * Concept tested
  * Scenario presented

Difficulty: ${difficulty}
Question Number: ${currentQIndex + 1} of ${quiz.totalQuestions}

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "question": "Your unique question here",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "Exact text of correct option",
  "explanation": "Brief explanation"
}`;

        let attempts = 0;
        const MAX_ATTEMPTS = 5;

        // ✅ FIX: Retry loop with better duplicate detection
        while (attempts < MAX_ATTEMPTS) {
            attempts++;
            
            for (const modelName of MODEL_PRIORITY) {
                try {
                    console.log(`🤖 Attempt ${attempts}/${MAX_ATTEMPTS} - Model: ${modelName} (Q${currentQIndex + 1}/${quiz.totalQuestions})`);
                    
                    const model = genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(prompt);
                    const response = await result.response;
                    const text = response.text();
                    
                    if (!text) continue;

                    const questionData = JSON.parse(cleanJSON(text));
                    
                    // ✅ FIX: Validate question structure
                    if (!questionData.question || !Array.isArray(questionData.options) || 
                        questionData.options.length !== 4 || !questionData.correctAnswer) {
                        console.warn('⚠️ Invalid question structure, retrying...');
                        continue;
                    }
                    
                    // ✅ FIX: Strict duplicate check (70% threshold)
                    const newQuestionLower = questionData.question.toLowerCase();
                    let isDuplicate = false;
                    
                    for (const prevQ of previousQuestions) {
                        const similarity = calculateSimilarity(prevQ, newQuestionLower);
                        if (similarity > 0.7) {
                            console.warn(`⚠️ Duplicate detected (${(similarity * 100).toFixed(0)}% match), retrying...`);
                            isDuplicate = true;
                            break;
                        }
                    }
                    
                    if (isDuplicate) continue;
                    
                    // ✅ SUCCESS: Unique question generated
                    questionData.difficulty = difficulty;
                    console.log(`✅ Unique question generated with ${modelName}`);
                    return res.json(questionData);
                    
                } catch (error) {
                    console.error(`❌ ${modelName} failed: ${error.message}`);
                    continue;
                }
            }
        }

        // ✅ FALLBACK: Use static unique question
        console.warn("⚠️ All AI attempts exhausted, using fallback");
        return res.json(getFallbackQuestion(quiz.topic, difficulty, currentQIndex, previousQuestions));

    } catch (error) {
        console.error("Critical Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// --- 5. SUBMIT & MINT - MAJOR FIX: Better Progress + Async Processing ---
exports.submitQuiz = async (req, res) => {
    const { quizId, score } = req.body;
    const userId = req.user.id;

    try {
        console.log(`📊 Quiz Submission: User ${userId}, Score ${score}`);
        
        const quiz = await Quiz.findById(quizId);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        const percentage = (score / quiz.totalQuestions) * 100;

        // ✅ FIX: Failed quiz response (no certificate)
        if (percentage < quiz.passingScore) {
            return res.json({ 
                passed: false, 
                score: percentage.toFixed(1),
                message: `Score: ${percentage.toFixed(1)}%. Required: ${quiz.passingScore}%.`,
                certificateId: null
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
                message: "You already have this certificate!" 
            });
        }

        // ✅ FIX: IMMEDIATE RESPONSE - Don't wait for minting
        const certId = `SKILL-${nanoid(8)}`;
        
        res.json({ 
            passed: true, 
            score: percentage.toFixed(1),
            certificateId: certId, 
            message: "Quiz Passed! Certificate is being generated...",
            processing: true // Flag for frontend to show processing state
        });

        // ✅ FIX: Async certificate generation (non-blocking)
        setImmediate(async () => {
            try {
                console.log(`🎓 Background: Issuing certificate for ${student.name}...`);
                
                let transactionHash = "PENDING";
                let tokenId = "PENDING";
                
                if (student.walletAddress) {
                    try {
                        const hashData = normalizedEmail + new Date() + certName;
                        const certHash = crypto.createHash('sha256').update(hashData).digest('hex');
                        const mintResult = await mintNFT(student.walletAddress, certHash);
                        transactionHash = mintResult.transactionHash;
                        tokenId = mintResult.tokenId.toString();
                        console.log(`✅ NFT Minted: Token ${tokenId}`);
                    } catch (mintError) {
                        console.error("⚠️ Minting warning:", mintError.message);
                    }
                }

                // Save certificate
                const newCert = new Certificate({
                    certificateId: certId,
                    tokenId,
                    certificateHash: transactionHash,
                    transactionHash,
                    studentName: student.name,
                    studentEmail: normalizedEmail,
                    eventName: certName,
                    eventDate: new Date(),
                    issuedBy: userId,
                    verificationUrl: `/verify/${certId}`
                });
                
                await newCert.save();
                console.log(`✅ Certificate ${certId} saved to database`);
                
                // Send email (non-blocking)
                sendCertificateIssued(normalizedEmail, student.name, certName, certId)
                    .catch(e => console.error('Email failed:', e.message));

            } catch (bgError) {
                console.error('❌ Background certificate generation failed:', bgError);
            }
        });

    } catch (error) {
        console.error('Submit Quiz Error:', error);
        res.status(500).json({ 
            message: "Error submitting quiz. Please try again.",
            error: error.message 
        });
    }
};