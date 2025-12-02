// In server/services/recommendation.service.js
const natural = require('natural');
const Certificate = require('../models/certificate.model');
const Event = require('../models/event.model');
const Quiz = require('../models/quiz.model');
// --- IMPORT THE ML MODEL ---
const MLModel = require('./ml.service'); 

class RecommendationEngine {
    constructor() {
        // Knowledge Graph: Defines prerequisites and next steps for specific skills
        this.skillGraph = {
            'HTML': ['CSS', 'JavaScript', 'Web Development'],
            'CSS': ['JavaScript', 'Tailwind', 'Design'],
            'JavaScript': ['React', 'Node.js', 'TypeScript', 'Vue.js', 'Web Development'],
            'Python': ['Django', 'Flask', 'Machine Learning', 'Data Science', 'AI'],
            'React': ['Redux', 'Next.js', 'GraphQL', 'Frontend Architecture'],
            'Node.js': ['Express', 'MongoDB', 'PostgreSQL', 'Backend Architecture'],
            'Machine Learning': ['Deep Learning', 'Computer Vision', 'NLP', 'TensorFlow'],
            'Data Science': ['Pandas', 'NumPy', 'Matplotlib', 'Big Data'],
            'Blockchain': ['Smart Contracts', 'Solidity', 'Ethereum', 'Web3', 'DeFi'],
            'Solidity': ['Hardhat', 'Security Auditing', 'DApps'],
            'Web Development': ['Frontend', 'Backend', 'Full Stack']
        };
    }

    /**
     * Main function to get personalized recommendations
     */
    async getRecommendations(studentEmail) {
        try {
            // 1. Fetch student's history
            const certificates = await Certificate.find({ 
                studentEmail: studentEmail.toLowerCase() 
            });

            // 2. Extract raw skills from certificate names
            const skills = this.extractSkills(certificates);
            
            // 3. Determine Skill Level based on count
            const skillLevel = this.calculateSkillLevel(certificates.length);
            
            // 4. GRAPH LOGIC: Find immediate next skills
            const nextSkills = this.predictNextSkills(skills);

            // 5. ML LOGIC: Predict long-term career path
            // This uses the TF-IDF Vector model we built
            const careerPaths = MLModel.predict(certificates);

            // 6. Build actionable recommendations (Quizzes/Events)
            const recommendations = await this.buildRecommendations(
                nextSkills, 
                skillLevel,
                studentEmail
            );

            // 7. Rank them by relevance
            const rankedRecommendations = this.rankRecommendations(recommendations, skills);

            return {
                currentSkills: skills,
                level: skillLevel,
                recommendations: rankedRecommendations.slice(0, 5), // Top 5 actions
                careerPaths: careerPaths // Top 3 ML predictions
            };

        } catch (error) {
            console.error('Recommendation Error:', error);
            // Fallback to safe default if ML fails
            return this.getBeginnerRecommendations();
        }
    }

    extractSkills(certificates) {
        const skillSet = new Set();
        certificates.forEach(cert => {
            const text = `${cert.eventName} ${cert.studentName}`.toLowerCase();
            Object.keys(this.skillGraph).forEach(skill => {
                if (text.includes(skill.toLowerCase())) {
                    skillSet.add(skill);
                }
            });
            if (text.includes('html')) skillSet.add('HTML');
            if (text.includes('css')) skillSet.add('CSS');
            if (text.includes('js') || text.includes('javascript')) skillSet.add('JavaScript');
        });
        return Array.from(skillSet);
    }

    calculateSkillLevel(certCount) {
        if (certCount >= 15) return 'Expert';
        if (certCount >= 8) return 'Advanced';
        if (certCount >= 3) return 'Intermediate';
        return 'Beginner';
    }

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
        if (nextSkills.size === 0) {
            ['JavaScript', 'Python', 'Blockchain'].forEach(s => nextSkills.add(s));
        }
        return Array.from(nextSkills);
    }

    async buildRecommendations(nextSkills, level, studentEmail) {
        const recommendations = [];
        const regexList = nextSkills.map(s => new RegExp(s, 'i'));

        if (regexList.length === 0) return [];

        const quizzes = await Quiz.find({ isActive: true, topic: { $in: regexList } }).limit(3);
        quizzes.forEach(quiz => {
            recommendations.push({
                type: 'quiz',
                title: quiz.topic,
                description: `Assess your ${quiz.topic} skills`,
                difficulty: 'Adaptive',
                reason: `Recommended next step`,
                id: quiz._id,
                score: 0.8
            });
        });

        const events = await Event.find({ date: { $gte: new Date() }, name: { $in: regexList } }).limit(3);
        events.forEach(event => {
            recommendations.push({
                type: 'event',
                title: event.name,
                description: event.description || 'Upcoming Workshop',
                date: event.date,
                reason: `Live learning session`,
                id: event._id,
                score: 0.9
            });
        });
        return recommendations;
    }

    rankRecommendations(recommendations, currentSkills) {
        return recommendations.sort((a, b) => b.score - a.score);
    }

    getBeginnerRecommendations() {
        return {
            currentSkills: [],
            level: 'Beginner',
            recommendations: [],
            careerPaths: [
                { path: 'Full-Stack Developer', completion: 0 },
                { path: 'Blockchain Engineer', completion: 0 }
            ]
        };
    }
}

module.exports = new RecommendationEngine();