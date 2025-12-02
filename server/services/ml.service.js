// In server/services/ml.service.js
const natural = require('natural');
const Vector = require('vector-object');

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
        
        // Train the model with career descriptions
        this.careerVectors = {};
        this.trainModel();
    }

    trainModel() {
        console.log("🧠 Training Career Prediction Model...");
        
        // Add documents to TF-IDF
        Object.keys(this.careers).forEach((career, index) => {
            this.tfidf.addDocument(this.careers[career]);
        });

        // Create vectors for each career
        Object.keys(this.careers).forEach((career, index) => {
            const vector = {};
            this.tfidf.listTerms(index).forEach(item => {
                vector[item.term] = item.tfidf;
            });
            this.careerVectors[career] = new Vector(vector);
        });
    }

    predict(studentCertificates) {
        // 1. Create a "Student Document" from all their certs
        const studentText = studentCertificates.map(c => 
            `${c.eventName} ${c.studentName}`.toLowerCase()
        ).join(" ");

        // 2. Vectorize the student
        // We create a temporary TF-IDF to get the vector for this specific student text
        // relative to our trained corpus.
        const tempTfidf = new natural.TfIdf();
        Object.values(this.careers).forEach(doc => tempTfidf.addDocument(doc));
        tempTfidf.addDocument(studentText);

        const studentVectorObj = {};
        // The student is the last document added (index = length of careers)
        const studentIndex = Object.keys(this.careers).length;
        
        tempTfidf.listTerms(studentIndex).forEach(item => {
            studentVectorObj[item.term] = item.tfidf;
        });
        
        const studentVector = new Vector(studentVectorObj);

        // 3. Compare against all careers (Cosine Similarity)
        const predictions = [];

        for (const [career, careerVector] of Object.entries(this.careerVectors)) {
            // Calculate similarity
            // We use a simplified dot product here because 'vector-object' works best with exact matching keys,
            // but for sparse text data, we need to handle missing keys gracefully.
            
            let score = 0;
            try {
                score = studentVector.cosineSimilarity(careerVector);
            } catch (e) {
                // Vector mismatch handling: manual dot product for sparse vectors
                score = this.manualCosineSimilarity(studentVectorObj, this.careerVectors[career].components);
            }
            
            // Normalize score to percentage (0-100)
            // Real ML scores are small, so we scale them up for display
            let percentage = Math.round(score * 100 * 2.5); 
            if (percentage > 100) percentage = 100;

            predictions.push({
                path: career,
                completion: percentage,
                // Explainability: matching keywords
                matches: this.getMatchingKeywords(studentText, this.careers[career])
            });
        }

        // Sort by highest match
        return predictions.sort((a, b) => b.completion - a.completion).slice(0, 3);
    }

    // Custom similarity for sparse text vectors
    manualCosineSimilarity(vecA, vecB) {
        let dotProduct = 0;
        let magA = 0;
        let magB = 0;

        const allKeys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);

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
        const studentWords = studentText.split(/\s+/);
        const careerWords = careerText.split(/\s+/);
        // Find intersection
        const matches = studentWords.filter(w => careerWords.includes(w));
        return [...new Set(matches)].length; // Unique matches count
    }
}

module.exports = new CareerPredictor();