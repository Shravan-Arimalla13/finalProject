// In server/models/event.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const participantSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    // participantId: { type: String, unique: true, sparse: true } // As per synopsis 
}, { _id: false }); // _id: false means participants are sub-documents

const eventSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    description: {
        type: String
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User', // Links to the Faculty/Admin who created it
        required: true
    },
    certificatesIssued: { // <--- ADD THIS
    type: Boolean,
    default: false
},
// --- NEW FIELD: Department Scope ---
    department: { type: String, required: true }, 
    // -----------------------------------
    participants: [participantSchema] ,
    // An array of participant 
    
    // --- NEW FIELD ---
    isPublic: { type: Boolean, default: false }, // True = Everyone sees it
    // -----------------

    // --- NEW: CERTIFICATE DESIGN CONFIGURATION ---
    certificateConfig: {
        theme: { 
            type: String, 
            enum: ['Classic', 'Modern', 'Minimal'], 
            default: 'Classic' 
        },
        // --- NEW FIELDS ---
        collegeAddress: { type: String, default: "No.14, Raghuvanahalli, Kanakapura Road, Bengaluru - 560109\nAffiliated to VTU, Belagavi & Approved by AICTE, New Delhi, Accredited by NBA ( CSE, ECE ) , NAAC A+" },
        headerDepartment: { type: String, default: 'DEPARTMENT OF MASTER OF COMPUTER APPLICATIONS (MCA)' },
        certificateTitle: { type: String, default: 'CERTIFICATE OF PARTICIPATION' },
        eventType: { type: String, default: 'Workshop' }, // e.g., Workshop, Seminar
        eventDuration: { type: String, default: '' }, // e.g., "2 Days", or empty
        // ------------------
        // --- NEW FIELDS ---
        collegeName: { type: String, default: 'K. S. Institute of Technology' }, // Default fallback
        collegeLogo: { type: String }, // This will store the Base64 image string
        signatureImage: { type: String }, // This will store the Base64 signature
        // ------------------
        showUSN: { type: Boolean, default: true },
        showIssuerName: { type: Boolean, default: true },
        showFooterID: { type: Boolean, default: true },
        customSignatureText: { type: String, default: 'Authorized Signature' }
    },
    // ---------------------------------------------
    

     // --- POAP / CHECK-IN FIELDS ---
    checkInToken: { type: String }, // Secret token for QR code
    checkInTokenExpiry: { type: Date },
    location: {
        latitude: Number,
        longitude: Number,
        address: String,
        radius: { type: Number, default: 0.5 } // km
    }
    // ------------------------------
    }, 

{ timestamps: true });

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;