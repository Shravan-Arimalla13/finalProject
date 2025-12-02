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
        this.gateway = 'https://gateway.pinata.cloud/ipfs/';
    }

    /**
     * Upload a PDF Buffer to IPFS
     */
    async uploadCertificate(pdfBuffer, certId) {
        try {
            // Convert Buffer to Readable Stream
            const stream = Readable.from(pdfBuffer);
            
            const options = {
                pinataMetadata: {
                    name: `CERT-${certId}.pdf`
                },
                pinataOptions: {
                    cidVersion: 0
                }
            };

            const result = await this.pinata.pinFileToIPFS(stream, options);
            console.log(`✅ PDF uploaded to IPFS: ${result.IpfsHash}`);
            
            return {
                hash: result.IpfsHash,
                url: `${this.gateway}${result.IpfsHash}`
            };
        } catch (error) {
            console.error("IPFS Upload Error:", error);
            return null; // Don't crash if IPFS fails
        }
    }

    /**
     * Upload Metadata JSON (Standard NFT Metadata)
     */
    async uploadMetadata(data) {
        try {
            const result = await this.pinata.pinJSONToIPFS(data, {
                pinataMetadata: { name: `META-${data.certificateId}.json` }
            });
            return {
                hash: result.IpfsHash,
                url: `${this.gateway}${result.IpfsHash}`
            };
        } catch (error) {
            console.error("IPFS Metadata Error:", error);
            return null;
        }
    }
}

module.exports = new IPFSService();