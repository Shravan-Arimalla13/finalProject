// In server/services/ml.service.js
const natural = require('natural');

// We don't strictly need 'vector-object' if we do the math manually, 
// which is safer and gives us full control.

class CareerPredictor {
    constructor() {
        this.tfidf = new natural.TfIdf();
        this.careers = {
            'Full-Stack Developer': "html css javascript react nodejs express mongodb api frontend backend web",
            'Data Scientist': "python data analysis pandas numpy matplotlib machine learning ai statistics visualization sql",
            'Blockchain Engineer': "blockchain solidity smart contracts ethereum web3 crypto security dapps consensus",
            'DevOps Engineer': "docker kubernetes aws cloud ci/cd linux automation scripting security networking",
            'Mobile Developer': "react native flutter android ios swift kotlin mobile app development ui/ux"
        };
        
        this.careerVectors = {};
        this.trainModel();
    }

    trainModel() {
        console.log("🧠 Training Career Prediction Model...");
        
        // 1. Add documents to TF-IDF
        Object.keys(this.careers).forEach((career) => {
            this.tfidf.addDocument(this.careers[career]);
        });

        // 2. Create vectors for each career (Simple Object: { term: score })
        Object.keys(this.careers).forEach((career, index) => {
            const vector = {};
            this.tfidf.listTerms(index).forEach(item => {
                vector[item.term] = item.tfidf;
            });
            this.careerVectors[career] = vector;
        });
    }

    predict(studentCertificates) {
        if (!studentCertificates || studentCertificates.length === 0) {
            return this.getDefaultPredictions();
        }

        // 1. Create a "Student Document"
        const studentText = studentCertificates.map(c => 
            `${c.eventName} ${c.studentName}`.toLowerCase()
        ).join(" ");

        // 2. Vectorize the student relative to our corpus
        // We create a new TF-IDF instance just for this comparison to keep it clean
        const tempTfidf = new natural.TfIdf();
        
        // Add standard docs again to establish the "Term Frequency" universe
        Object.values(this.careers).forEach(doc => tempTfidf.addDocument(doc));
        tempTfidf.addDocument(studentText);

        const studentVector = {};
        const studentIndex = Object.keys(this.careers).length; // Last index is the student
        
        tempTfidf.listTerms(studentIndex).forEach(item => {
            studentVector[item.term] = item.tfidf;
        });

        // 3. Compare
        const predictions = [];

        for (const [career, careerVector] of Object.entries(this.careerVectors)) {
            // Validate vectors before math
            if (!studentVector || !careerVector) continue;

            const score = this.manualCosineSimilarity(studentVector, careerVector);
            
            // Normalize score to percentage (Scale up small ML scores)
            let percentage = Math.round(score * 100 * 2.5); 
            if (percentage > 100) percentage = 100;

            predictions.push({
                path: career,
                completion: percentage,
                matches: this.getMatchingKeywords(studentText, this.careers[career])
            });
        }

        // Sort by highest match
        return predictions.sort((a, b) => b.completion - a.completion).slice(0, 3);
    }

    // Safe Cosine Similarity
    manualCosineSimilarity(vecA, vecB) {
        // Safety check for null/undefined
        if (!vecA || !vecB) return 0;

        let dotProduct = 0;
        let magA = 0;
        let magB = 0;

        // Get all unique keys from both vectors
        // This was the crash point before (Object.keys on null)
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
        const studentWords = studentText.split(/\s+/);
        const careerWords = careerText.split(/\s+/);
        const matches = studentWords.filter(w => careerWords.includes(w));
        return [...new Set(matches)].length; 
    }

    getDefaultPredictions() {
        return [
            { path: 'Full-Stack Developer', completion: 0, matches: 0 },
            { path: 'Blockchain Engineer', completion: 0, matches: 0 },
            { path: 'Data Scientist', completion: 0, matches: 0 }
        ];
    }
}

module.exports = new CareerPredictor();