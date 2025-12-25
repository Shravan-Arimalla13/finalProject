// server/services/poap.service.js - COMPLETE ENHANCED VERSION
const { ethers } = require('ethers');
const crypto = require('crypto');
require('dotenv').config();

const { 
    getCurrentIST, 
    parseEventTimeIST, 
    getEventStatusIST,
    formatISTDisplay 
} = require('../utils/timezone');

const contractArtifact = require('../artifacts/contracts/POAPCredential.sol/POAPCredential.json');

// GPS Distance Calculator
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
            console.log('✅ POAP Service initialized with 10-minute QR validity');
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
     * NEW: Validate if event is currently ongoing (for QR generation)
     */
    validateEventIsLive(eventDate, startTime, endTime) {
        const status = getEventStatusIST(eventDate, startTime, endTime);
        const now = getCurrentIST();
        
        if (status !== 'Ongoing') {
            return {
                isLive: false,
                status: status,
                message: status === 'Upcoming' 
                    ? `Event hasn't started yet. Opens at ${startTime} IST`
                    : `Event has ended. Closed at ${endTime} IST`,
                currentIST: formatISTDisplay(now)
            };
        }
        
        return {
            isLive: true,
            status: 'Ongoing',
            message: 'Event is currently live',
            currentIST: formatISTDisplay(now)
        };
    }

    /**
     * NEW: Validate QR token (10-minute expiry)
     */
    validateQRToken(qrGeneratedAt, token) {
        const now = getCurrentIST();
        const generatedTime = new Date(qrGeneratedAt);
        const expiryTime = new Date(generatedTime.getTime() + 10 * 60 * 1000); // 10 minutes
        
        const remainingMs = expiryTime - now;
        const remainingSeconds = Math.floor(remainingMs / 1000);
        
        if (remainingMs <= 0) {
            return {
                isValid: false,
                expired: true,
                message: 'QR code has expired. Please ask faculty to generate a new one.',
                remainingSeconds: 0
            };
        }
        
        return {
            isValid: true,
            expired: false,
            message: 'QR code is valid',
            remainingSeconds: remainingSeconds,
            expiresAt: formatISTDisplay(expiryTime)
        };
    }

    /**
     * ENHANCED: Calculate attendance score with 10-minute grace period
     * - First 10 minutes after QR generation = 100%
     * - After that: -5 points per 5 minutes (min 50%)
     */
    calculateAttendanceScore(qrGeneratedAt, checkInTime) {
        const qrTime = new Date(qrGeneratedAt);
        const checkIn = new Date(checkInTime);
        
        const elapsedMinutes = (checkIn - qrTime) / (1000 * 60);
        
        // Within 10-minute grace period = Perfect score
        if (elapsedMinutes <= 10) {
            console.log(`✅ On-time check-in: ${elapsedMinutes.toFixed(1)} min after QR`);
            return 100;
        }
        
        // After grace period: deduct 5 points per 5 minutes late
        const lateMinutes = elapsedMinutes - 10;
        const deduction = Math.floor(lateMinutes / 5) * 5;
        const score = Math.max(50, 100 - deduction);
        
        console.log(`⏰ Late check-in: ${elapsedMinutes.toFixed(1)} min after QR (${lateMinutes.toFixed(1)} min late) → Score: ${score}%`);
        return score;
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
                message: `You are ${distance.toFixed(2)}km away. Must be within ${radiusKm}km.`
            };
        }
        return { isValid: true, distance };
    }

    async mintPOAP(studentWallet, eventData, gps, eventLocation = null) {
        if (!this.contract) throw new Error('Contract not initialized');

        if (eventLocation && eventLocation.latitude && eventLocation.longitude) {
            const locCheck = this.validateLocation(gps.latitude, gps.longitude, eventLocation.latitude, eventLocation.longitude, eventLocation.radius || 0.5);
            if (!locCheck.isValid) throw new Error(locCheck.message);
        }

        const eventHash = this.generateEventHash(eventData.eventId, eventData.eventName, eventData.eventDate);
        const gpsString = `${gps.latitude.toFixed(6)},${gps.longitude.toFixed(6)}`;
        
        const tx = await this.contract.mintPOAP(studentWallet, eventHash, gpsString);
        const receipt = await tx.wait();
        
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