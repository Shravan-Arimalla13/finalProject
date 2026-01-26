// server/services/ml.service.js - ENHANCED VERSION WITH BETTER SKILL EXTRACTION
const natural = require('natural');

class CareerPredictor {
    constructor() {
        this.tfidf = new natural.TfIdf();
        
        // EXPANDED career knowledge base with more keywords
        this.careers = {
            'Full-Stack Developer': "html css javascript typescript react angular vue nodejs express mongodb mysql postgresql api rest graphql frontend backend web responsive bootstrap tailwind git github",
            'Data Scientist': "python r data analysis pandas numpy matplotlib seaborn machine learning scikit-learn ai statistics visualization sql jupyter tableau powerbi tensorflow keras",
            'Blockchain Engineer': "blockchain solidity smart contracts ethereum web3 crypto security dapps consensus hardhat truffle nft defi cryptocurrency bitcoin",
            'DevOps Engineer': "docker kubernetes aws azure gcp cloud ci/cd jenkins linux bash automation scripting terraform ansible security networking prometheus grafana",
            'Mobile Developer': "react native flutter android ios swift kotlin java mobile app development ui/ux firebase redux state management",
            'AI/ML Engineer': "artificial intelligence machine learning deep learning neural networks tensorflow pytorch opencv nlp computer vision transformers llm gpt",
            'Cybersecurity Specialist': "security penetration testing ethical hacking cryptography network security firewall vulnerability assessment kali linux wireshark",
            'Cloud Architect': "aws azure gcp cloud infrastructure serverless lambda s3 ec2 microservices distributed systems scalability",
            'Game Developer': "unity unreal engine c++ c# game development 3d graphics physics engine game design animation",
            'Frontend Developer': "html css javascript react vue angular sass less webpack babel responsive design accessibility ui/ux figma"
        };
        
        // Enhanced skill keywords for better extraction
        this.skillKeywords = new Set([
            // Programming Languages
            'python', 'javascript', 'java', 'c++', 'c#', 'typescript', 'go', 'rust', 'swift', 'kotlin', 'php', 'ruby',
            // Web Technologies
            'html', 'css', 'react', 'vue', 'angular', 'nodejs', 'express', 'django', 'flask', 'spring', 'laravel',
            // Databases
            'mongodb', 'mysql', 'postgresql', 'redis', 'cassandra', 'dynamodb', 'firebase',
            // DevOps & Cloud
            'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'jenkins', 'terraform', 'ansible',
            // Data Science & AI
            'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'pandas', 'numpy', 'scikit-learn', 'ai',
            // Blockchain
            'blockchain', 'solidity', 'ethereum', 'smart contracts', 'web3', 'nft', 'defi', 'cryptocurrency',
            // Mobile
            'android', 'ios', 'react native', 'flutter', 'swift', 'kotlin',
            // Other
            'git', 'api', 'rest', 'graphql', 'microservices', 'security', 'testing', 'agile', 'scrum'
        ]);
        
        this.careerVectors = {};
        this.trainModel();
        
        console.log('🧠 Enhanced Career Prediction Model trained with', Object.keys(this.careers).length, 'career paths');
    }

    trainModel() {
        // Add career documents to TF-IDF
        Object.keys(this.careers).forEach((career) => {
            this.tfidf.addDocument(this.careers[career]);
        });

        // Create vectors for each career
        Object.keys(this.careers).forEach((career, index) => {
            const vector = {};
            this.tfidf.listTerms(index).forEach(item => {
                vector[item.term] = item.tfidf;
            });
            this.careerVectors[career] = vector;
        });
    }

    /**
     * ENHANCED: Extract skills from certificates with better pattern matching
     */
    extractSkillsFromCertificates(certificates) {
        const detectedSkills = new Set();
        
        certificates.forEach(cert => {
            const text = `${cert.eventName} ${cert.description || ''}`.toLowerCase();
            
            // Check against known skill keywords
            this.skillKeywords.forEach(skill => {
                if (text.includes(skill.toLowerCase())) {
                    detectedSkills.add(skill);
                }
            });
            
            // Extract technology names using patterns
            const techPatterns = [
                /\b(html5?|css3?)\b/gi,
                /\b(react|vue|angular)(js)?\b/gi,
                /\b(node|express|django|flask)(js)?\b/gi,
                /\b(python|java|javascript|typescript)\b/gi,
                /\b(mongodb|mysql|postgresql|redis)\b/gi,
                /\b(docker|kubernetes|aws|azure)\b/gi,
                /\b(machine learning|deep learning|ai)\b/gi,
                /\b(blockchain|solidity|ethereum|web3)\b/gi
            ];
            
            techPatterns.forEach(pattern => {
                const matches = text.match(pattern);
                if (matches) {
                    matches.forEach(match => detectedSkills.add(match.toLowerCase()));
                }
            });
        });
        
        return Array.from(detectedSkills);
    }

    /**
     * ENHANCED: Predict career paths with skill extraction
     */
    predict(studentCertificates) {
        if (!studentCertificates || studentCertificates.length === 0) {
            return this.getDefaultPredictions();
        }

        // Extract skills from certificates
        const detectedSkills = this.extractSkillsFromCertificates(studentCertificates);
        
        console.log('📊 Detected Skills:', detectedSkills);

        // Create student document from certificate names AND detected skills
        const studentText = [
            ...studentCertificates.map(c => c.eventName.toLowerCase()),
            ...detectedSkills
        ].join(" ");

        // Create temporary TF-IDF for student analysis
        const tempTfidf = new natural.TfIdf();
        
        // Add career documents
        Object.values(this.careers).forEach(doc => tempTfidf.addDocument(doc));
        
        // Add student document
        tempTfidf.addDocument(studentText);
        const studentIndex = Object.keys(this.careers).length;

        // Vectorize student profile
        const studentVector = {};
        tempTfidf.listTerms(studentIndex).forEach(item => {
            studentVector[item.term] = item.tfidf;
        });

        // Compare against career vectors
        const predictions = [];

        for (const [career, careerVector] of Object.entries(this.careerVectors)) {
            const score = this.cosineSimilarity(studentVector, careerVector);
            const matches = this.getMatchingKeywords(studentText, this.careers[career]);
            
            // Calculate percentage with skill boost
            let percentage = Math.round(score * 100 * 2.5);
            
            // Boost score if we have matching skills
            const skillBoost = Math.min(matches * 5, 30); // Max 30% boost
            percentage = Math.min(100, percentage + skillBoost);
            
            // Ensure minimum score if student has certificates
            if (studentCertificates.length > 0 && percentage < 10) {
                percentage = 10 + Math.min(studentCertificates.length * 5, 20);
            }

            predictions.push({
                path: career,
                completion: percentage,
                matches: matches,
                detectedSkills: detectedSkills.slice(0, 5) // Top 5 skills
            });
        }

        // Sort by highest match
        const sorted = predictions.sort((a, b) => b.completion - a.completion);
        
        // Return top 3
        return sorted.slice(0, 3);
    }

    cosineSimilarity(vecA, vecB) {
        if (!vecA || !vecB) return 0;

        let dotProduct = 0;
        let magA = 0;
        let magB = 0;

        const keysA = Object.keys(vecA);
        const keysB = Object.keys(vecB);
        const allKeys = new Set([...keysA, ...keysB]);

        allKeys.forEach(key => {
            const valA = vecA[key] || 0;
            const valB = vecB[key] || 0;
            dotProduct += valA * valB;
            magA += valA * valA;
            magB += valB * valB;
        });

        magA = Math.sqrt(magA);
        magB = Math.sqrt(magB);

        if (magA === 0 || magB === 0) return 0;
        return dotProduct / (magA * magB);
    }

    getMatchingKeywords(studentText, careerText) {
        if (!studentText || !careerText) return 0;
        
        const studentWords = studentText.toLowerCase().split(/\s+/);
        const careerWords = careerText.toLowerCase().split(/\s+/);
        
        const matches = studentWords.filter(word => 
            word.length > 2 && careerWords.includes(word)
        );
        
        return [...new Set(matches)].length;
    }

    getDefaultPredictions() {
        return [
            { path: 'Full-Stack Developer', completion: 0, matches: 0, detectedSkills: [] },
            { path: 'Blockchain Engineer', completion: 0, matches: 0, detectedSkills: [] },
            { path: 'Data Scientist', completion: 0, matches: 0, detectedSkills: [] }
        ];
    }

    addCareer(careerName, skills) {
        if (this.careers[careerName]) {
            console.warn(`Career "${careerName}" already exists. Updating...`);
        }
        
        this.careers[careerName] = skills.toLowerCase();
        
        // Retrain model
        this.tfidf = new natural.TfIdf();
        this.careerVectors = {};
        this.trainModel();
        
        console.log(`✅ Added career: ${careerName}`);
    }

    getAvailableCareers() {
        return Object.keys(this.careers);
    }

    getCareerInfo(careerName) {
        if (!this.careers[careerName]) return null;
        
        return {
            name: careerName,
            requiredSkills: this.careers[careerName].split(' '),
            vector: this.careerVectors[careerName]
        };
    }
}

module.exports = new CareerPredictor();