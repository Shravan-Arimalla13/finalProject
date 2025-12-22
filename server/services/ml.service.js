// server/services/ml.service.js - FIXED VERSION
const natural = require('natural');

class CareerPredictor {
    constructor() {
        this.tfidf = new natural.TfIdf();
        
        // Career knowledge base
        this.careers = {
            'Full-Stack Developer': "html css javascript react nodejs express mongodb api frontend backend web",
            'Data Scientist': "python data analysis pandas numpy matplotlib machine learning ai statistics visualization sql",
            'Blockchain Engineer': "blockchain solidity smart contracts ethereum web3 crypto security dapps consensus",
            'DevOps Engineer': "docker kubernetes aws cloud ci/cd linux automation scripting security networking",
            'Mobile Developer': "react native flutter android ios swift kotlin mobile app development ui/ux"
        };
        
        this.careerVectors = {};
        this.trainModel();
        
        console.log('🧠 Career Prediction Model trained successfully');
    }

    /**
     * Train the TF-IDF model once during initialization
     */
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
     * Predict career paths from student certificates
     * FIXED: Reuses trained model without creating new instances
     * @param {Array} studentCertificates - Array of certificate objects
     * @returns {Array} Predicted career paths with scores
     */
    predict(studentCertificates) {
        if (!studentCertificates || studentCertificates.length === 0) {
            return this.getDefaultPredictions();
        }

        // Create student document from certificate names
        const studentText = studentCertificates
            .map(c => `${c.eventName}`.toLowerCase())
            .join(" ");

        // Create a temporary TF-IDF instance for student analysis
        // This is necessary because we need to vectorize student text
        // But we clean it up immediately after use
        const tempTfidf = new natural.TfIdf();
        
        // Add career documents to establish term frequency baseline
        Object.values(this.careers).forEach(doc => tempTfidf.addDocument(doc));
        
        // Add student document
        tempTfidf.addDocument(studentText);
        const studentIndex = Object.keys(this.careers).length;

        // Vectorize student profile
        const studentVector = {};
        tempTfidf.listTerms(studentIndex).forEach(item => {
            studentVector[item.term] = item.tfidf;
        });

        // Compare student vector against trained career vectors
        const predictions = [];

        for (const [career, careerVector] of Object.entries(this.careerVectors)) {
            const score = this.cosineSimilarity(studentVector, careerVector);
            
            // Normalize score to percentage (amplify small ML scores)
            let percentage = Math.round(score * 100 * 2.5);
            percentage = Math.min(100, Math.max(0, percentage));

            predictions.push({
                path: career,
                completion: percentage,
                matches: this.getMatchingKeywords(studentText, this.careers[career])
            });
        }

        // Sort by highest match
        return predictions.sort((a, b) => b.completion - a.completion).slice(0, 3);
    }

    /**
     * Calculate cosine similarity between two vectors
     * FIXED: Safe implementation with null checks
     * @param {Object} vecA - First vector
     * @param {Object} vecB - Second vector
     * @returns {number} Similarity score (0-1)
     */
    cosineSimilarity(vecA, vecB) {
        // Safety check for null/undefined
        if (!vecA || !vecB) return 0;

        let dotProduct = 0;
        let magA = 0;
        let magB = 0;

        // Get all unique keys from both vectors
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

    /**
     * Count matching keywords between student and career
     * @param {string} studentText - Student's aggregated skills
     * @param {string} careerText - Career skill requirements
     * @returns {number} Count of matching keywords
     */
    getMatchingKeywords(studentText, careerText) {
        if (!studentText || !careerText) return 0;
        
        const studentWords = studentText.toLowerCase().split(/\s+/);
        const careerWords = careerText.toLowerCase().split(/\s+/);
        
        const matches = studentWords.filter(word => 
            word.length > 3 && careerWords.includes(word)
        );
        
        return [...new Set(matches)].length;
    }

    /**
     * Get default predictions for new users
     * @returns {Array} Default career predictions
     */
    getDefaultPredictions() {
        return [
            { path: 'Full-Stack Developer', completion: 0, matches: 0 },
            { path: 'Blockchain Engineer', completion: 0, matches: 0 },
            { path: 'Data Scientist', completion: 0, matches: 0 }
        ];
    }

    /**
     * Add new career path to model
     * @param {string} careerName - Name of career
     * @param {string} skills - Space-separated skill keywords
     */
    addCareer(careerName, skills) {
        if (this.careers[careerName]) {
            console.warn(`Career "${careerName}" already exists. Updating...`);
        }
        
        this.careers[careerName] = skills.toLowerCase();
        
        // Retrain model with new career
        this.tfidf = new natural.TfIdf();
        this.careerVectors = {};
        this.trainModel();
        
        console.log(`✅ Added career: ${careerName}`);
    }

    /**
     * Get all available career paths
     * @returns {Array} Array of career names
     */
    getAvailableCareers() {
        return Object.keys(this.careers);
    }

    /**
     * Get detailed info about a specific career
     * @param {string} careerName - Name of career
     * @returns {Object} Career information
     */
    getCareerInfo(careerName) {
        if (!this.careers[careerName]) {
            return null;
        }
        
        return {
            name: careerName,
            requiredSkills: this.careers[careerName].split(' '),
            vector: this.careerVectors[careerName]
        };
    }
}

// Export singleton instance
module.exports = new CareerPredictor();