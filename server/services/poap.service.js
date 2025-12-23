// server/services/poap.service.js - COMPLETE POAP SERVICE
const { ethers } = require('ethers');
const crypto = require('crypto');
require('dotenv').config();

const contractArtifact = require('../artifacts/contracts/POAPCredential.sol/POAPCredential.json');

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

/**
 * Validate GPS coordinates
 */
function validateGPSCoordinates(latitude, longitude) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
        return { valid: false, error: 'Invalid coordinate format' };
    }
    
    if (lat < -90 || lat > 90) {
        return { valid: false, error: 'Latitude must be between -90 and 90' };
    }
    
    if (lng < -180 || lng > 180) {
        return { valid: false, error: 'Longitude must be between -180 and 180' };
    }
    
    return { valid: true, latitude: lat, longitude: lng };
}

class POAPService {
    constructor() {
        // Validate configuration
        if (!process.env.POAP_CONTRACT_ADDRESS) {
            console.warn('⚠️ POAP_CONTRACT_ADDRESS not configured');
            console.warn('   POAP features will not work until configured');
            this.contract = null;
            return;
        }
        
        if (!process.env.BLOCKCHAIN_RPC_URL) {
            console.error('❌ BLOCKCHAIN_RPC_URL not configured');
            this.contract = null;
            return;
        }
        
        if (!process.env.PRIVATE_KEY) {
            console.error('❌ PRIVATE_KEY not configured');
            this.contract = null;
            return;
        }
        
        try {
            // Initialize provider and signer
            const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
            const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
            
            // Initialize contract
            this.contract = new ethers.Contract(
                process.env.POAP_CONTRACT_ADDRESS, 
                contractArtifact.abi, 
                signer
            );
            
            console.log('✅ POAP Service initialized');
            console.log(`📍 Contract: ${process.env.POAP_CONTRACT_ADDRESS}`);
            
            // Test connection
            this.testConnection();
            
        } catch (error) {
            console.error('❌ POAP Service initialization failed:', error.message);
            this.contract = null;
        }
    }

    /**
     * Test blockchain connection
     */
    async testConnection() {
        try {
            const tokenId = await this.contract.getCurrentTokenId();
            console.log(`✅ POAP Contract accessible. Next Token ID: ${tokenId}`);
        } catch (error) {
            console.error('⚠️ POAP Contract test failed:', error.message);
        }
    }

    /**
     * Generate deterministic hash for event
     * @param {string} eventId - MongoDB ObjectId
     * @param {string} eventName - Event name
     * @param {Date} eventDate - Event date
     * @returns {string} Keccak256 hash
     */
    generateEventHash(eventId, eventName, eventDate) {
        const data = `${eventId}-${eventName}-${new Date(eventDate).toISOString()}`;
        return ethers.keccak256(ethers.toUtf8Bytes(data));
    }

    /**
     * Validate GPS Location with proper distance check
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

        // If event has no location, it's virtual
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
                message: `You must be within ${radiusKm}km of the venue. Current distance: ${distance.toFixed(2)}km`
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
     * Validate check-in time window
     * @param {Date} eventDate - Event date
     * @param {string} startTime - Event start time (HH:MM)
     * @param {string} endTime - Event end time (HH:MM)
     * @returns {Object} Time validation result
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
                message: `Check-in opens at ${startTime} (or 30 minutes before). Too early.`
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
     * Calculate attendance score based on punctuality
     * @param {Date} eventDate - Event date
     * @param {string} startTime - Scheduled start time (HH:MM)
     * @param {Date} checkInTime - Actual check-in time
     * @returns {number} Score from 50-100
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
     * Mint POAP NFT with complete validation
     * @param {string} studentWallet - Ethereum address
     * @param {Object} eventData - Event information
     * @param {Object} gps - GPS coordinates
     * @param {Object} eventLocation - Event venue location (optional)
     * @returns {Promise<Object>} Mint result with tokenId and txHash
     */
    async mintPOAP(studentWallet, eventData, gps, eventLocation = null) {
        if (!this.contract) {
            throw new Error('POAP Service not initialized. Check contract configuration.');
        }

        try {
            // Validate GPS if event has physical location
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
            } else {
                console.log('🌐 Virtual event - skipping GPS validation');
            }

            // Generate event hash
            const eventHash = this.generateEventHash(
                eventData.eventId, 
                eventData.eventName, 
                eventData.eventDate
            );
            
            // Format GPS string for blockchain
            const gpsString = gps.latitude && gps.longitude 
                ? `${gps.latitude.toFixed(6)},${gps.longitude.toFixed(6)}` 
                : 'Virtual Event';
            
            console.log(`🎫 Minting POAP for ${studentWallet}...`);
            console.log(`   Event Hash: ${eventHash}`);
            console.log(`   GPS: ${gpsString}`);
            
            // Call smart contract
            const tx = await this.contract.mintPOAP(
                studentWallet, 
                eventHash, 
                gpsString
            );
            
            console.log(`⏳ Transaction submitted: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ POAP minted in block ${receipt.blockNumber}`);
            
            // Parse transaction logs to get token ID
            let tokenId = null;
            for (const log of receipt.logs) {
                try {
                    const parsedLog = this.contract.interface.parseLog(log);
                    if (parsedLog && parsedLog.name === 'POAPMinted') {
                        tokenId = parsedLog.args.tokenId.toString();
                        console.log(`🎫 Token ID: ${tokenId}`);
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }

            // Fallback: fetch from contract if parsing failed
            if (!tokenId) {
                console.warn('⚠️ Could not parse tokenId, fetching from contract...');
                const currentCounter = await this.contract.getCurrentTokenId();
                tokenId = currentCounter.toString();
            }
            
            return { 
                tokenId,
                transactionHash: tx.hash,
                eventHash,
                blockNumber: receipt.blockNumber,
                gpsVerified: !!eventLocation,
                gpsCoordinates: gpsString
            };
            
        } catch (error) {
            console.error("❌ POAP Mint Error:", error.message);
            
            // Provide specific error messages
            if (error.message.includes('already claimed')) {
                throw new Error('You have already claimed a POAP for this event.');
            } else if (error.message.includes('Invalid wallet')) {
                throw new Error('Invalid Ethereum wallet address.');
            } else if (error.message.includes('insufficient funds')) {
                throw new Error('Insufficient gas funds for transaction.');
            } else {
                throw error;
            }
        }
    }

    /**
     * Revoke POAP (for fraudulent check-ins)
     * @param {string} tokenId - POAP token ID
     * @param {string} reason - Reason for revocation
     * @returns {Promise<string>} Transaction hash
     */
    async revokePOAP(tokenId, reason = 'Admin revocation') {
        if (!this.contract) {
            throw new Error('POAP Service not initialized');
        }

        try {
            console.log(`🚫 Revoking POAP #${tokenId}...`);
            console.log(`   Reason: ${reason}`);
            
            const tx = await this.contract.revokeAttendance(tokenId);
            console.log(`⏳ Revocation transaction: ${tx.hash}`);
            
            await tx.wait();
            console.log(`✅ POAP #${tokenId} revoked successfully`);
            
            return tx.hash;
        } catch (error) {
            console.error("❌ POAP Revocation Error:", error.message);
            throw error;
        }
    }

    /**
     * Update attendance score
     * @param {string} tokenId - POAP token ID
     * @param {number} newScore - New score (0-100)
     * @returns {Promise<string>} Transaction hash
     */
    async updateAttendanceScore(tokenId, newScore) {
        if (!this.contract) {
            throw new Error('POAP Service not initialized');
        }

        if (newScore < 0 || newScore > 100) {
            throw new Error('Score must be between 0 and 100');
        }

        try {
            console.log(`📊 Updating POAP #${tokenId} score to ${newScore}...`);
            
            const tx = await this.contract.updateAttendanceScore(tokenId, newScore);
            await tx.wait();
            
            console.log(`✅ Score updated successfully`);
            return tx.hash;
        } catch (error) {
            console.error("❌ Score Update Error:", error.message);
            throw error;
        }
    }

    /**
     * Get student's attendance record
     * @param {string} walletAddress - Student's wallet
     * @returns {Promise<Array>} Array of event hashes
     */
    async getStudentAttendance(walletAddress) {
        if (!this.contract) {
            throw new Error('POAP Service not initialized');
        }

        try {
            const attendance = await this.contract.getStudentAttendance(walletAddress);
            return attendance;
        } catch (error) {
            console.error("❌ Get Attendance Error:", error.message);
            return [];
        }
    }

    /**
     * Check if POAP is valid (not revoked)
     * @param {string} tokenId - POAP token ID
     * @returns {Promise<boolean>} True if valid
     */
    async isAttendanceValid(tokenId) {
        if (!this.contract) {
            throw new Error('POAP Service not initialized');
        }

        try {
            const isValid = await this.contract.isAttendanceValid(tokenId);
            return isValid;
        } catch (error) {
            console.error("❌ Validation Check Error:", error.message);
            return false;
        }
    }

    /**
     * Get full attendance record
     * @param {string} tokenId - POAP token ID
     * @returns {Promise<Object>} Attendance record
     */
    async getAttendanceRecord(tokenId) {
        if (!this.contract) {
            throw new Error('POAP Service not initialized');
        }

        try {
            const record = await this.contract.getAttendanceRecord(tokenId);
            return {
                eventHash: record.eventHash,
                checkInTime: new Date(Number(record.checkInTime) * 1000),
                geoLocation: record.geoLocation,
                isValid: record.isValid,
                attendanceScore: record.attendanceScore
            };
        } catch (error) {
            console.error("❌ Get Record Error:", error.message);
            return null;
        }
    }
}

module.exports = new POAPService();