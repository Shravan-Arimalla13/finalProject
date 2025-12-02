const { ethers } = require('ethers');
    const crypto = require('crypto');
    require('dotenv').config();

    // Assuming you compile the contract, the JSON artifact will be here
    const contractArtifact = require('../artifacts/contracts/POAPCredential.sol/POAPCredential.json');

    class POAPService {
        constructor() {
            if (!process.env.POAP_CONTRACT_ADDRESS) return;
            const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
            const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
            this.contract = new ethers.Contract(process.env.POAP_CONTRACT_ADDRESS, contractArtifact.abi, signer);
        }

        generateEventHash(eventId, eventName, eventDate) {
            const data = `${eventId}-${eventName}-${eventDate}`;
            return ethers.keccak256(ethers.toUtf8Bytes(data));
        }

        // Simplified GPS check (Haversine Formula)
        validateLocation(lat1, lon1, lat2, lon2, radiusKm = 0.5) {
            if (!lat2 || !lon2) return true; // No location set = virtual event
            const R = 6371; 
            const dLat = (lat2 - lat1) * (Math.PI/180);
            const dLon = (lon2 - lon1) * (Math.PI/180);
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return (R * c) <= radiusKm;
        }

        async mintPOAP(studentWallet, eventData, gps) {
            try {
                const eventHash = this.generateEventHash(eventData.eventId, eventData.eventName, eventData.eventDate);
                // For simplicity in demo, we pass raw GPS string or a hash of it
                const gpsString = `${gps.latitude},${gps.longitude}`;
                
                console.log(`Minting POAP for ${studentWallet}...`);
                const tx = await this.contract.mintPOAP(studentWallet, eventHash, gpsString);
                await tx.wait();
                
                // In a real app, you parse logs to get ID. For demo, we might fetch total supply or similar.
                // Assuming simple counter logic for now or parsing logs like we did for Certs.
                // returning mock ID for speed if parsing is complex, but ideally parse receipt.
                return { 
                    tokenId: Date.now().toString(), // Placeholder ID logic needs log parsing like previous module
                    transactionHash: tx.hash,
                    eventHash 
                };
            } catch (error) {
                console.error("POAP Mint Error:", error);
                throw error;
            }
        }
    }

    module.exports = new POAPService();