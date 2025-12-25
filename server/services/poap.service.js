// server/services/poap.service.js - IST FIXED VERSION
const { ethers } = require('ethers');
const crypto = require('crypto');
require('dotenv').config();

// IMPORT IST UTILITIES
const { 
    getCurrentIST, 
    parseEventTimeIST, 
    validateEventTimeIST,
    calculateAttendanceScoreIST 
} = require('../utils/timezone');

const contractArtifact = require('../artifacts/contracts/POAPCredential.sol/POAPCredential.json');

// GPS Distance Calculator (unchanged)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function validateGPSCoordinates(latitude, longitude) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng)) return { valid: false, error: 'Invalid format' };
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return { valid: false, error: 'Out of range' };
    return { valid: true, latitude: lat, longitude: lng };
}

class POAPService {
    constructor() {
        if (!process.env.POAP_CONTRACT_ADDRESS || !process.env.BLOCKCHAIN_RPC_URL || !process.env.PRIVATE_KEY) {
            console.warn('⚠️ POAP Service missing env configuration');
            this.contract = null;
            return;
        }
        
        try {
            const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
            const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
            this.contract = new ethers.Contract(
                process.env.POAP_CONTRACT_ADDRESS, 
                contractArtifact.abi, 
                signer
            );
            console.log('✅ POAP Service initialized with IST timezone support');
        } catch (error) {
            console.error('❌ POAP Initialization failed:', error.message);
            this.contract = null;
        }
    }

    generateEventHash(eventId, eventName, eventDate) {
        const data = `${eventId}-${eventName}-${new Date(eventDate).toISOString()}`;
        return ethers.keccak256(ethers.toUtf8Bytes(data));
    }

    /**
     * CRITICAL FIX: Validate check-in time using IST timezone
     * This ensures Indian students can check in at the correct local time
     */
    validateCheckInTime(eventDate, startTime, endTime) {
        return validateEventTimeIST(eventDate, startTime, endTime, 30);
    }

    /**
     * Calculate attendance score using IST
     */
    // server/services/poap.service.js

// server/services/poap.service.js

/**
 * Calculate attendance score based on punctuality with a Grace Period
 * Ensures a student checking in at 4:25 for a 4:20 event is marked ON-TIME.
 */
calculateAttendanceScoreIST(eventDate, startTime, checkInTime) {
    const [sHour, sMin] = startTime.split(':').map(Number);
    const scheduledStart = new Date(eventDate);
    scheduledStart.setHours(sHour, sMin, 0, 0);

    // FIX: 10-minute Grace Period
    // If check-in is within 10 minutes of start, give 100 score (On-Time)
    const gracePeriodEnd = new Date(scheduledStart.getTime() + 10 * 60 * 1000);

    if (checkInTime <= gracePeriodEnd) {
        return 100; // On-Time
    }
    
    // Late: Deduct 5 points per 10 minutes past the scheduled start
    const lateMinutes = (checkInTime - scheduledStart) / (1000 * 60);
    const deduction = Math.floor(lateMinutes / 10) * 5;
    return Math.max(50, 100 - deduction);
}

/**
 * Validates the 10-minute window for the specific QR token
 */
validateTokenExpiry(expiryDate) {
    const now = new Date();
    if (now > expiryDate) {
        return { isValid: false, message: "QR Code has expired. Please ask the faculty to regenerate." };
    }
    return { isValid: true };
}

    validateLocation(userLat, userLon, eventLat, eventLon, radiusKm = 0.5) {
        const userVal = validateGPSCoordinates(userLat, userLon);
        if (!userVal.valid) throw new Error('Invalid user GPS');
        if (!eventLat || !eventLon) return { isValid: true, isVirtual: true };
        
        const eventVal = validateGPSCoordinates(eventLat, eventLon);
        if (!eventVal.valid) throw new Error('Invalid event GPS');
        
        const distance = calculateDistance(userVal.latitude, userVal.longitude, eventVal.latitude, eventVal.longitude);
        if (distance > radiusKm) {
            return {
                isValid: false,
                message: `Distance Error: You are ${distance.toFixed(2)}km away. Max allowed is ${radiusKm}km.`
            };
        }
        return { isValid: true, distance };
    }

    async mintPOAP(studentWallet, eventData, gps, eventLocation = null) {
        if (!this.contract) throw new Error('Contract not initialized');

        // Location Check
        if (eventLocation && eventLocation.latitude && eventLocation.longitude) {
            const locCheck = this.validateLocation(gps.latitude, gps.longitude, eventLocation.latitude, eventLocation.longitude, eventLocation.radius || 0.5);
            if (!locCheck.isValid) throw new Error(locCheck.message);
        }

        const eventHash = this.generateEventHash(eventData.eventId, eventData.eventName, eventData.eventDate);
        const gpsString = `${gps.latitude.toFixed(6)},${gps.longitude.toFixed(6)}`;
        
        const tx = await this.contract.mintPOAP(studentWallet, eventHash, gpsString);
        const receipt = await tx.wait();
        
        // Find Token ID from logs
        let tokenId = "0";
        for (const log of receipt.logs) {
            try {
                const parsed = this.contract.interface.parseLog(log);
                if (parsed.name === 'POAPMinted') {
                    tokenId = parsed.args.tokenId.toString();
                    break;
                }
            } catch (e) { continue; }
        }

        return { tokenId, transactionHash: tx.hash };
    }

    async isAttendanceValid(tokenId) {
        try { return await this.contract.isAttendanceValid(tokenId); }
        catch (e) { return false; }
    }
}

module.exports = new POAPService();