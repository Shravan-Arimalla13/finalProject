// In server/middleware/upload.middleware.js
const multer = require('multer');

// Configure multer to store files in memory
const storage = multer.memoryStorage();

// Create the upload middleware
// We'll call it 'rosterFile' in our form
const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Only accept CSV files
        if (file.mimetype === 'text/csv') {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only CSV files are allowed.'), false);
        }
    }
}).single('rosterFile');

module.exports = upload;