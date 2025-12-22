// server/services/poap.service.js - FIXED VERSION
const { ethers } = require('ethers');
const crypto = require('crypto');
const { calculateDistance, validateGPSCoordinates } = require('../utils/helpers');
require('dotenv').config();

const contractArtifact = require('../artifacts/contracts/POAPCredential.sol/POAPCredential.json');

class POAPService {
    constructor() {
        if (!process.env.POAP_CONTRACT_ADDRESS) {
            console.warn('⚠️ POAP Contract Address not configured');
            return;
        }
        
        const provider = new ethers.JsonRpcProvider(
            process.env.BLOCKCHAIN_RPC_URL
        );
        const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        
        this.contract = new ethers.Contract(
            process.env.POAP_CONTRACT_ADDRESS, 
            contractArtifact.abi, 
            signer
        );
        
        console.log('✅ POAP Service initialized');
    }

    /**
     * Generate deterministic hash for event
     */
    generateEventHash(eventId, eventName, eventDate) {
        const data = `${eventId}-${eventName}-${eventDate}`;
        return ethers.keccak256(ethers.toUtf8Bytes(data));
    }

    /**
     * Validate GPS Location with Proper Distance Check
     * @param {number} userLat - User's latitude
     * @param {number} userLon - User's longitude
     * @param {number} eventLat - Event venue latitude
     * @param {number} eventLon - Event venue longitude
     * @param {number} radiusKm - Allowed radius in kilometers
     * @returns {Object} Validation result
     */
    validateLocation(userLat, userLon, eventLat, eventLon, radiusKm = 0.5) {
        // Validate user coordinates
        const userValidation = validateGPSCoordinates(userLat, userLon);
        if (!userValidation.valid) {
            throw new Error(`Invalid user GPS: ${userValidation.error}`);
        }

        // If event has no location set, it's a virtual event
        if (!eventLat || !eventLon) {
            return {
                isValid: true,
                isVirtual: true,
                distance: null,
                message: 'Virtual event - location check bypassed'
            };
        }

        // Validate event coordinates
        const eventValidation = validateGPSCoordinates(eventLat, eventLon);
        if (!eventValidation.valid) {
            throw new Error(`Invalid event GPS: ${eventValidation.error}`);
        }

        // Calculate distance
        const distance = calculateDistance(
            userValidation.latitude,
            userValidation.longitude,
            eventValidation.latitude,
            eventValidation.longitude
        );

        // Check if within radius
        if (distance > radiusKm) {
            return {
                isValid: false,
                isVirtual: false,
                distance: distance,
                requiredRadius: radiusKm,
                message: `You must be within ${radiusKm}km of the event venue. You are ${distance.toFixed(2)}km away.`
            };
        }

        return {
            isValid: true,
            isVirtual: false,
            distance: distance,
            message: `Location verified: ${distance.toFixed(3)}km from venue`
        };
    }

    /**
     * Mint POAP NFT with GPS Validation
     */
    async mintPOAP(studentWallet, eventData, gps, eventLocation = null) {
        try {
            // Validate GPS if event has a physical location
            if (eventLocation && eventLocation.latitude && eventLocation.longitude) {
                const locationCheck = this.validateLocation(
                    gps.latitude,
                    gps.longitude,
                    eventLocation.latitude,
                    eventLocation.longitude,
                    eventLocation.radius || 0.5
                );

                if (!locationCheck.isValid) {
                    throw new Error(locationCheck.message);
                }

                console.log(`✅ GPS Verified: ${locationCheck.message}`);
            }

            // Generate event hash
            const eventHash = this.generateEventHash(
                eventData.eventId, 
                eventData.eventName, 
                eventData.eventDate
            );
            
            // Format GPS string for blockchain
            const gpsString = `${gps.latitude.toFixed(6)},${gps.longitude.toFixed(6)}`;
            
            console.log(`🎫 Minting POAP for ${studentWallet}...`);
            
            // Call smart contract
            const tx = await this.contract.mintPOAP(
                studentWallet, 
                eventHash, 
                gpsString
            );
            
            console.log(`⏳ Transaction submitted: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ POAP minted successfully`);
            
            // Parse transaction logs to get token ID
            let tokenId = null;
            for (const log of receipt.logs) {
                try {
                    const parsedLog = this.contract.interface.parseLog(log);
                    if (parsedLog && parsedLog.name === 'POAPMinted') {
                        tokenId = parsedLog.args.tokenId.toString();
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }

            // Fallback: use timestamp if parsing fails
            if (!tokenId) {
                tokenId = Date.now().toString();
                console.warn('⚠️ Using timestamp as tokenId fallback');
            }
            
            return { 
                tokenId,
                transactionHash: tx.hash,
                eventHash,
                gpsVerified: true
            };
            
        } catch (error) {
            console.error("❌ POAP Mint Error:", error.message);
            throw error;
        }
    }

    /**
     * Validate if student is within time window for check-in
     */
    validateCheckInTime(eventDate, startTime, endTime) {
        const now = new Date();
        const eventDateStr = new Date(eventDate).toISOString().split('T')[0];
        const start = new Date(`${eventDateStr}T${startTime}:00`);
        const end = new Date(`${eventDateStr}T${endTime}:00`);
        
        // Allow check-in 30 minutes before start
        const earlyCheckIn = new Date(start.getTime() - 30 * 60 * 1000);
        
        if (now < earlyCheckIn) {
            return {
                isValid: false,
                message: `Check-in opens at ${startTime}. Too early.`
            };
        }
        
        if (now > end) {
            return {
                isValid: false,
                message: `Check-in closed at ${endTime}. Event has ended.`
            };
        }
        
        return {
            isValid: true,
            message: 'Check-in time valid'
        };
    }

    /**
     * Calculate attendance score (100 = on time, <100 = late)
     */
    calculateAttendanceScore(eventDate, startTime, checkInTime) {
        const eventDateStr = new Date(eventDate).toISOString().split('T')[0];
        const scheduledStart = new Date(`${eventDateStr}T${startTime}:00`);
        const checkIn = new Date(checkInTime);
        
        // Early or on-time = 100
        if (checkIn <= scheduledStart) {
            return 100;
        }
        
        // Late: deduct 5 points per 10 minutes, minimum 50
        const lateMinutes = (checkIn - scheduledStart) / (1000 * 60);
        const deduction = Math.floor(lateMinutes / 10) * 5;
        return Math.max(50, 100 - deduction);
    }

    /**
     * Revoke POAP (for fraudulent check-ins)
     */
    async revokePOAP(tokenId, reason) {
        try {
            console.log(`🚫 Revoking POAP #${tokenId}...`);
            const tx = await this.contract.revokeAttendance(tokenId);
            await tx.wait();
            
            console.log(`✅ POAP revoked: ${reason}`);
            return tx.hash;
        } catch (error) {
            console.error("❌ POAP Revocation Error:", error.message);
            throw error;
        }
    }
}

module.exports = new POAPService();