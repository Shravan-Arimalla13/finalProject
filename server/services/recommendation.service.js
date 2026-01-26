// server/services/recommendation.service.js - ENHANCED WITH REAL DATA
// Place this file at: server/services/recommendation.service.js
const natural = require('natural');
const Certificate = require('../models/certificate.model');
const Event = require('../models/event.model');
const Quiz = require('../models/quiz.model');
const POAP = require('../models/poap.model');
const MLModel = require('./ml.service');

class RecommendationEngine {
    constructor() {
        // ENHANCED skill graph with more connections
        this.skillGraph = {
            // Web Development Path
            'HTML': ['CSS', 'JavaScript', 'Web Development', 'Responsive Design'],
            'CSS': ['JavaScript', 'Tailwind', 'Bootstrap', 'SASS', 'Design'],
            'JavaScript': ['React', 'Node.js', 'TypeScript', 'Vue.js', 'Angular', 'Web Development'],
            'React': ['Redux', 'Next.js', 'GraphQL', 'Frontend Architecture', 'TypeScript'],
            'Vue': ['Vuex', 'Nuxt.js', 'Frontend Architecture'],
            'Node.js': ['Express', 'MongoDB', 'PostgreSQL', 'Backend Architecture', 'GraphQL'],
            'TypeScript': ['React', 'Node.js', 'Angular', 'Advanced JavaScript'],
            
            // Backend Path
            'Express': ['MongoDB', 'API Development', 'Microservices'],
            'MongoDB': ['Database Design', 'Backend Architecture'],
            'PostgreSQL': ['Database Design', 'Backend Architecture', 'SQL'],
            
            // Data Science Path
            'Python': ['Django', 'Flask', 'Machine Learning', 'Data Science', 'AI', 'Pandas'],
            'Pandas': ['NumPy', 'Data Analysis', 'Machine Learning'],
            'NumPy': ['Machine Learning', 'Data Science'],
            'Machine Learning': ['Deep Learning', 'Computer Vision', 'NLP', 'TensorFlow', 'PyTorch'],
            'Data Science': ['Pandas', 'NumPy', 'Matplotlib', 'Machine Learning', 'Statistics'],
            'Deep Learning': ['Computer Vision', 'NLP', 'TensorFlow', 'PyTorch'],
            
            // Blockchain Path
            'Blockchain': ['Smart Contracts', 'Solidity', 'Ethereum', 'Web3', 'DeFi'],
            'Solidity': ['Hardhat', 'Security Auditing', 'DApps', 'Smart Contracts'],
            'Ethereum': ['Web3', 'Smart Contracts', 'DApps'],
            'Web3': ['DApps', 'NFT', 'DeFi'],
            
            // DevOps Path
            'Docker': ['Kubernetes', 'CI/CD', 'DevOps'],
            'Kubernetes': ['Cloud Computing', 'Microservices', 'DevOps'],
            'AWS': ['Cloud Computing', 'DevOps', 'Serverless'],
            'CI/CD': ['Jenkins', 'GitHub Actions', 'DevOps'],
            
            // Mobile Path
            'React Native': ['Mobile Development', 'React', 'TypeScript'],
            'Flutter': ['Mobile Development', 'Dart'],
            
            // General
            'Web Development': ['Frontend', 'Backend', 'Full Stack', 'API Development'],
            'API Development': ['REST', 'GraphQL', 'Microservices'],
            'Git': ['GitHub', 'Version Control', 'CI/CD']
        };
    }

    /**
     * MAIN FUNCTION - Enhanced with real data
     */
    async getRecommendations(studentEmail) {
        try {
            console.log(`\n🔍 Generating recommendations for: ${studentEmail}`);
            
            // 1. Fetch ALL student data
            const [certificates, poaps, quizResults] = await Promise.all([
                Certificate.find({ studentEmail: studentEmail.toLowerCase() }),
                POAP.find({ studentEmail: studentEmail.toLowerCase() }),
                this.getQuizHistory(studentEmail)
            ]);

            console.log(`📊 Data fetched: ${certificates.length} certs, ${poaps.length} POAPs, ${quizResults.length} quizzes`);

            // 2. Extract comprehensive skills from ALL sources
            const skills = this.extractComprehensiveSkills(certificates, poaps, quizResults);
            console.log(`🎯 Extracted Skills:`, skills);
            
            // 3. Calculate skill level
            const totalActivities = certificates.length + poaps.length + quizResults.length;
            const skillLevel = this.calculateSkillLevel(totalActivities);
            console.log(`📈 Skill Level: ${skillLevel} (based on ${totalActivities} activities)`);
            
            // 4. Find next skills using graph logic
            const nextSkills = this.predictNextSkills(skills);
            console.log(`➡️ Next Skills:`, nextSkills);

            // 5. ML prediction for career paths
            const careerPaths = MLModel.predict(certificates);
            console.log(`🎓 Career Predictions:`, careerPaths.map(c => `${c.path}: ${c.completion}%`));

            // 6. Build actionable recommendations
            const recommendations = await this.buildRecommendations(
                nextSkills, 
                skillLevel,
                studentEmail,
                skills
            );
            console.log(`💡 Built ${recommendations.length} recommendations`);

            // 7. Rank and return
            const rankedRecommendations = this.rankRecommendations(recommendations, skills);

            return {
                currentSkills: skills,
                level: skillLevel,
                totalActivities: totalActivities,
                recommendations: rankedRecommendations.slice(0, 5),
                careerPaths: careerPaths
            };

        } catch (error) {
            console.error('❌ Recommendation Error:', error);
            return this.getBeginnerRecommendations();
        }
    }

    /**
     * ENHANCED: Extract skills from multiple sources
     */
    extractComprehensiveSkills(certificates, poaps, quizResults) {
        const skillSet = new Set();
        
        // 1. Extract from certificates
        certificates.forEach(cert => {
            const text = `${cert.eventName} ${cert.description || ''}`.toLowerCase();
            this.extractSkillsFromText(text, skillSet);
        });
        
        // 2. Extract from POAPs (events attended)
        poaps.forEach(poap => {
            const text = `${poap.eventName}`.toLowerCase();
            this.extractSkillsFromText(text, skillSet);
        });
        
        // 3. Extract from quiz topics
        quizResults.forEach(quiz => {
            if (quiz.topic) {
                this.extractSkillsFromText(quiz.topic.toLowerCase(), skillSet);
            }
        });
        
        return Array.from(skillSet);
    }

    /**
     * Helper: Extract skills from text
     */
    extractSkillsFromText(text, skillSet) {
        // Check against skill graph keys
        Object.keys(this.skillGraph).forEach(skill => {
            if (text.includes(skill.toLowerCase())) {
                skillSet.add(skill);
            }
        });
        
        // Common technology patterns
        const patterns = [
            'html', 'css', 'javascript', 'python', 'java', 'react', 'vue', 'angular',
            'node', 'express', 'django', 'flask', 'mongodb', 'sql', 'postgresql',
            'docker', 'kubernetes', 'aws', 'blockchain', 'solidity', 'ethereum',
            'machine learning', 'ai', 'data science', 'tensorflow', 'pytorch'
        ];
        
        patterns.forEach(pattern => {
            if (text.includes(pattern)) {
                // Capitalize properly
                const capitalized = pattern
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
                skillSet.add(capitalized);
            }
        });
    }

    /**
     * Get quiz completion history
     */
    async getQuizHistory(studentEmail) {
        try {
            // Find all certificates that are quiz-based (contain "Certified:" prefix)
            const quizCerts = await Certificate.find({
                studentEmail: studentEmail.toLowerCase(),
                eventName: { $regex: /^Certified:/i }
            });
            
            return quizCerts.map(cert => ({
                topic: cert.eventName.replace(/^Certified:\s*/i, ''),
                completedAt: cert.createdAt
            }));
        } catch (error) {
            console.error('Quiz history fetch failed:', error);
            return [];
        }
    }

    /**
     * ENHANCED: Skill level calculation
     */
    calculateSkillLevel(activityCount) {
        if (activityCount >= 20) return 'Expert';
        if (activityCount >= 12) return 'Advanced';
        if (activityCount >= 5) return 'Intermediate';
        if (activityCount >= 1) return 'Beginner';
        return 'Novice';
    }

    /**
     * ENHANCED: Predict next skills using graph logic
     */
    predictNextSkills(currentSkills) {
        const nextSkills = new Set();
        
        currentSkills.forEach(skill => {
            if (this.skillGraph[skill]) {
                this.skillGraph[skill].forEach(next => {
                    if (!currentSkills.includes(next)) {
                        nextSkills.add(next);
                    }
                });
            }
        });
        
        // If no progression found, suggest foundational skills
        if (nextSkills.size === 0) {
            ['JavaScript', 'Python', 'React', 'Blockchain', 'Machine Learning'].forEach(s => {
                if (!currentSkills.includes(s)) {
                    nextSkills.add(s);
                }
            });
        }
        
        return Array.from(nextSkills);
    }

    /**
     * ENHANCED: Build recommendations from available quizzes and events
     */
    async buildRecommendations(nextSkills, level, studentEmail, currentSkills) {
        const recommendations = [];
        
        // Build regex patterns for searching
        const skillPatterns = nextSkills.map(skill => new RegExp(skill, 'i'));
        
        // 1. Find matching quizzes
        try {
            const quizzes = await Quiz.find({
                isActive: true,
                topic: { $in: skillPatterns }
            }).limit(5);
            
            // Check which quizzes student has already completed
            const completedQuizTopics = await Certificate.find({
                studentEmail: studentEmail.toLowerCase(),
                eventName: { $regex: /^Certified:/i }
            }).distinct('eventName');
            
            const completedSet = new Set(
                completedQuizTopics.map(name => name.replace(/^Certified:\s*/i, '').toLowerCase())
            );
            
            quizzes.forEach(quiz => {
                if (!completedSet.has(quiz.topic.toLowerCase())) {
                    recommendations.push({
                        type: 'quiz',
                        id: quiz._id,
                        title: `${quiz.topic} Quiz`,
                        reason: `Build your ${quiz.topic} expertise`,
                        difficulty: level,
                        score: 0.9,
                        category: 'Skill Assessment'
                    });
                }
            });
        } catch (error) {
            console.error('Quiz fetch error:', error);
        }
        
        // 2. Find upcoming relevant events
        try {
            const upcomingEvents = await Event.find({
                date: { $gte: new Date() },
                isPublic: true,
                $or: skillPatterns.map(pattern => ({ name: pattern }))
            }).limit(5);
            
            // Check registered events
            const registeredEvents = await Event.find({
                'participants.email': studentEmail.toLowerCase()
            }).distinct('_id');
            
            const registeredSet = new Set(registeredEvents.map(id => id.toString()));
            
            upcomingEvents.forEach(event => {
                if (!registeredSet.has(event._id.toString())) {
                    recommendations.push({
                        type: 'event',
                        id: event._id,
                        title: event.name,
                        reason: `Hands-on learning opportunity`,
                        date: event.date,
                        score: 1.0,
                        category: 'Live Event'
                    });
                }
            });
        } catch (error) {
            console.error('Event fetch error:', error);
        }
        
        // 3. If no specific recommendations, suggest general skills
        if (recommendations.length === 0) {
            const generalSuggestions = [
                { skill: 'JavaScript', reason: 'Essential for web development' },
                { skill: 'Python', reason: 'Versatile for AI and backend' },
                { skill: 'React', reason: 'Leading frontend framework' },
                { skill: 'Blockchain', reason: 'Emerging technology skill' }
            ];
            
            generalSuggestions.forEach(({ skill, reason }) => {
                if (!currentSkills.includes(skill)) {
                    recommendations.push({
                        type: 'suggestion',
                        title: `Learn ${skill}`,
                        reason: reason,
                        score: 0.7,
                        category: 'Suggested Path'
                    });
                }
            });
        }
        
        return recommendations;
    }

    /**
     * Rank recommendations by relevance
     */
    rankRecommendations(recommendations, currentSkills) {
        return recommendations.sort((a, b) => {
            // Prioritize events over quizzes over suggestions
            const typeScore = {
                'event': 3,
                'quiz': 2,
                'suggestion': 1
            };
            
            const aTypeScore = typeScore[a.type] || 0;
            const bTypeScore = typeScore[b.type] || 0;
            
            if (aTypeScore !== bTypeScore) {
                return bTypeScore - aTypeScore;
            }
            
            // Then by score
            return (b.score || 0) - (a.score || 0);
        });
    }

    /**
     * Fallback for new users
     */
    getBeginnerRecommendations() {
        return {
            currentSkills: [],
            level: 'Novice',
            totalActivities: 0,
            recommendations: [
                {
                    type: 'suggestion',
                    title: 'Start with JavaScript Basics',
                    reason: 'Foundation for web development',
                    category: 'Getting Started'
                },
                {
                    type: 'suggestion',
                    title: 'Explore Blockchain Concepts',
                    reason: 'Understand the technology behind credentials',
                    category: 'Getting Started'
                }
            ],
            careerPaths: [
                { path: 'Full-Stack Developer', completion: 0, matches: 0, detectedSkills: [] },
                { path: 'Blockchain Engineer', completion: 0, matches: 0, detectedSkills: [] },
                { path: 'Data Scientist', completion: 0, matches: 0, detectedSkills: [] }
            ]
        };
    }
}

module.exports = new RecommendationEngine();