// In server/services/recommendation.service.js
const natural = require('natural');
const Certificate = require('../models/certificate.model');
const Event = require('../models/event.model');
const Quiz = require('../models/quiz.model');

class RecommendationEngine {
    constructor() {
        this.TfIdf = natural.TfIdf;
        this.tfidf = new this.TfIdf();
        
        // Knowledge Graph: Defines prerequisites and next steps
        this.skillGraph = {
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

    async getRecommendations(studentEmail) {
        try {
            // 1. Analyze History
            const certificates = await Certificate.find({ 
                studentEmail: studentEmail.toLowerCase() 
            });

            const skills = this.extractSkills(certificates);
            const skillLevel = this.calculateSkillLevel(certificates.length);
            const nextSkills = this.predictNextSkills(skills);

            // 2. Find Matching Content
            const recommendations = await this.buildRecommendations(
                nextSkills, 
                skillLevel,
                studentEmail
            );

            // 3. Rank Results
            const rankedRecommendations = this.rankRecommendations(
                recommendations, 
                skills
            );

            return {
                currentSkills: skills,
                level: skillLevel,
                recommendations: rankedRecommendations.slice(0, 5),
                careerPath: this.suggestCareerPath(skills)
            };

        } catch (error) {
            console.error('Recommendation Error:', error);
            // Return safe default if ML fails
            return this.getBeginnerRecommendations(); 
        }
    }

    extractSkills(certificates) {
        const skillSet = new Set();
        
        certificates.forEach(cert => {
            const text = `${cert.eventName} ${cert.studentName}`.toLowerCase(); // Add description if you have it
            
            // Match against our knowledge graph keys
            Object.keys(this.skillGraph).forEach(skill => {
                if (text.includes(skill.toLowerCase())) {
                    skillSet.add(skill);
                }
            });
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
            // Look up the skill in our graph
            if (this.skillGraph[skill]) {
                this.skillGraph[skill].forEach(next => {
                    // Suggest it if they don't already have it
                    if (!currentSkills.includes(next)) {
                        nextSkills.add(next);
                    }
                });
            }
        });

        // Cold Start: If no skills found, suggest basics
        if (nextSkills.size === 0) {
            ['JavaScript', 'Python', 'Blockchain'].forEach(s => nextSkills.add(s));
        }

        return Array.from(nextSkills);
    }

    async buildRecommendations(nextSkills, level, studentEmail) {
        const recommendations = [];

        // Regex for fuzzy matching
        const regexList = nextSkills.map(s => new RegExp(s, 'i'));

        // 1. Find Quizzes (Active & Relevant)
        const quizzes = await Quiz.find({ 
            isActive: true,
            topic: { $in: regexList }
        }).limit(3);

        quizzes.forEach(quiz => {
            recommendations.push({
                type: 'quiz',
                title: quiz.topic,
                description: `Assess your ${quiz.topic} skills`,
                difficulty: 'Adaptive',
                reason: `Recommended next step for your path`,
                id: quiz._id,
                score: 0.8
            });
        });

        // 2. Find Events (Future & Relevant)
        const events = await Event.find({
            date: { $gte: new Date() },
            name: { $in: regexList }
        }).limit(3);

        events.forEach(event => {
            recommendations.push({
                type: 'event',
                title: event.name,
                description: event.description || 'Upcoming Workshop',
                date: event.date,
                reason: `Learn ${this.extractPrimarySkill(event.name)} live`,
                id: event._id,
                score: 0.9
            });
        });

        return recommendations;
    }

    rankRecommendations(recommendations, currentSkills) {
        // Simple ranking: Events > Quizzes
        return recommendations.sort((a, b) => b.score - a.score);
    }

    suggestCareerPath(skills) {
        const paths = {
            'Full-Stack Developer': ['JavaScript', 'React', 'Node.js', 'MongoDB'],
            'Data Scientist': ['Python', 'Machine Learning', 'Data Science', 'Pandas'],
            'Blockchain Developer': ['Blockchain', 'Solidity', 'Smart Contracts', 'Web3'],
            'Mobile Developer': ['React Native', 'Flutter', 'iOS', 'Android']
        };

        let bestMatch = { path: 'General Technology', score: 0 };

        Object.entries(paths).forEach(([path, requiredSkills]) => {
            const matchCount = requiredSkills.filter(s => 
                skills.some(skill => skill.toLowerCase().includes(s.toLowerCase()))
            ).length;

            const score = matchCount / requiredSkills.length;
            if (score > bestMatch.score) {
                bestMatch = { path, score, completion: Math.round(score * 100) };
            }
        });

        if (bestMatch.score === 0) return { path: 'Exploring Tech', completion: 10 };
        return bestMatch;
    }

    // Helpers
    isValidSkill(word) {
        const techKeywords = ['react', 'python', 'java', 'docker', 'aws', 'node', 'solidity'];
        return techKeywords.includes(word.toLowerCase());
    }

    capitalizeSkill(word) {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }

    extractPrimarySkill(text) {
        for (const skill of Object.keys(this.skillGraph)) {
            if (text.toLowerCase().includes(skill.toLowerCase())) return skill;
        }
        return 'New Skill';
    }

    getBeginnerRecommendations() {
        return {
            currentSkills: [],
            level: 'Beginner',
            recommendations: [], // Empty list triggers "Explore" UI
            careerPath: { path: 'Student', score: 0, completion: 0 }
        };
    }
}

module.exports = new RecommendationEngine();