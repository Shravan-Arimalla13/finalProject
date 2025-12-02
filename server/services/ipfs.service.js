// In server/services/ipfs.service.js
const pinataSDK = require('@pinata/sdk');
const { Readable } = require('stream');
require('dotenv').config();

class IPFSService {
    constructor() {
        this.pinata = new pinataSDK({
            pinataApiKey: process.env.PINATA_API_KEY,
            pinataSecretApiKey: process.env.PINATA_SECRET_KEY
        });
        
        // Public gateway for file retrieval
        this.gateway = 'https://gateway.pinata.cloud/ipfs/';
    }

    /**
     * Upload PDF buffer to IPFS
     */
    async uploadCertificate(pdfBuffer, metadata) {
        try {
            // Test authentication
            await this.pinata.testAuthentication();

            // Convert buffer to readable stream
            const stream = Readable.from(pdfBuffer);
            
            // Prepare options with metadata
            const options = {
                pinataMetadata: {
                    name: `${metadata.certificateId}.pdf`,
                    keyvalues: {
                        studentName: metadata.studentName,
                        eventName: metadata.eventName,
                        issueDate: new Date(metadata.eventDate).toISOString(),
                        certificateId: metadata.certificateId
                    }
                },
                pinataOptions: {
                    cidVersion: 1 
                }
            };

            // Upload to IPFS
            const result = await this.pinata.pinFileToIPFS(stream, options);
            
            console.log(`✅ PDF uploaded to IPFS: ${result.IpfsHash}`);

            // --- FIX: Construct URL explicitly ---
            const finalUrl = `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
            
            return {
                ipfsHash: result.IpfsHash,
                ipfsUrl: finalUrl, // Use the variable we just made
                timestamp: result.Timestamp,
                size: pdfBuffer.length
            };

        } catch (error) {
            console.error('IPFS Upload Error:', error);
            // Return null so the controller knows it failed
            return null; 
        }
    }

    /**
     * Upload JSON metadata to IPFS
     */
    async uploadMetadata(certData) {
        try {
            const metadata = {
                certificateId: certData.certificateId,
                studentName: certData.studentName,
                studentEmail: certData.studentEmail,
                eventName: certData.eventName,
                eventDate: certData.eventDate,
                issuer: certData.issuedBy,
                blockchainHash: certData.certificateHash,
                transactionHash: certData.transactionHash,
                issuedAt: new Date().toISOString()
            };

            const options = {
                pinataMetadata: {
                    name: `${certData.certificateId}-metadata.json`
                }
            };

            const result = await this.pinata.pinJSONToIPFS(metadata, options);

            console.log(`✅ Metadata uploaded to IPFS: ${result.IpfsHash}`);
            const finalUrl = `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;

            return {
                ipfsHash: result.IpfsHash,
                ipfsUrl: finalUrl
            };

        } catch (error) {
            console.error('IPFS Metadata Upload Error:', error);
            return null;
        }
    }
    
    // Helper to fetch file (if needed)
    async getFile(ipfsHash) {
        const url = `${this.gateway}${ipfsHash}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch from IPFS");
        return response;
    }
}

module.exports = new IPFSService();