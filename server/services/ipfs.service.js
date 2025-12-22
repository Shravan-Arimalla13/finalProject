// server/services/ipfs.service.js - COMPLETE FIXED VERSION
const pinataSDK = require('@pinata/sdk');
const { Readable } = require('stream');
require('dotenv').config();

class IPFSService {
    constructor() {
        // Initialize Pinata SDK
        this.pinata = new pinataSDK({
            pinataApiKey: process.env.PINATA_API_KEY,
            pinataSecretApiKey: process.env.PINATA_SECRET_KEY
        });
        
        // Multiple gateway fallbacks for maximum reliability
        this.gateways = [
            'https://gateway.pinata.cloud/ipfs/',
            'https://ipfs.io/ipfs/',
            'https://cloudflare-ipfs.com/ipfs/',
            'https://gateway.ipfs.io/ipfs/',
            'https://dweb.link/ipfs/'
        ];
        
        console.log('📦 IPFS Service initialized with', this.gateways.length, 'fallback gateways');
        
        // Test authentication on startup
        this.testConnection();
    }

    /**
     * Test Pinata connection on startup
     */
    async testConnection() {
        try {
            await this.pinata.testAuthentication();
            console.log('✅ Pinata authentication successful');
        } catch (error) {
            console.error('⚠️ Pinata authentication failed:', error.message);
            console.error('   IPFS uploads will fail until credentials are fixed');
        }
    }

    /**
     * Get multiple gateway URLs for an IPFS hash
     * Provides primary URL and fallbacks for redundancy
     * @param {string} ipfsHash - The IPFS content identifier (CID)
     * @returns {Object} Primary URL and fallback URLs
     */
    getIPFSUrls(ipfsHash) {
        return {
            primary: `${this.gateways[0]}${ipfsHash}`,
            fallbacks: this.gateways.slice(1).map(gateway => `${gateway}${ipfsHash}`),
            allUrls: this.gateways.map(gateway => `${gateway}${ipfsHash}`)
        };
    }

    /**
     * Test which gateways are currently accessible
     * @param {string} ipfsHash - Test hash to check (optional)
     * @returns {Promise<Array>} List of working gateway URLs
     */
    async testGateways(ipfsHash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG') {
        const workingGateways = [];
        
        console.log('🔍 Testing IPFS gateway accessibility...');
        
        for (const gateway of this.gateways) {
            try {
                const url = `${gateway}${ipfsHash}`;
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);
                
                const response = await fetch(url, { 
                    signal: controller.signal,
                    method: 'HEAD' // Faster than GET
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    workingGateways.push(gateway);
                    console.log(`  ✅ ${gateway}`);
                } else {
                    console.log(`  ❌ ${gateway} (HTTP ${response.status})`);
                }
            } catch (error) {
                console.log(`  ❌ ${gateway} (${error.message})`);
            }
        }
        
        console.log(`✅ ${workingGateways.length}/${this.gateways.length} gateways accessible`);
        return workingGateways;
    }

    /**
     * Upload PDF buffer to IPFS with retry logic
     * Implements exponential backoff for transient failures
     * @param {Buffer} pdfBuffer - PDF file as buffer
     * @param {Object} metadata - Certificate metadata
     * @param {number} maxRetries - Maximum retry attempts (default: 3)
     * @returns {Promise<Object|null>} Upload result with URLs, or null if all attempts fail
     */
    async uploadCertificate(pdfBuffer, metadata, maxRetries = 3) {
        let lastError = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`📤 IPFS Upload Attempt ${attempt}/${maxRetries} for ${metadata.certificateId}`);
                
                // Test authentication before upload
                await this.pinata.testAuthentication();

                // Convert buffer to readable stream (required by Pinata SDK)
                const stream = Readable.from(pdfBuffer);
                
                // Prepare options with metadata for easier retrieval
                const options = {
                    pinataMetadata: {
                        name: `${metadata.certificateId}.pdf`,
                        keyvalues: {
                            studentName: metadata.studentName,
                            eventName: metadata.eventName,
                            issueDate: new Date(metadata.eventDate).toISOString(),
                            certificateId: metadata.certificateId,
                            uploadAttempt: attempt.toString(),
                            uploadTimestamp: new Date().toISOString()
                        }
                    },
                    pinataOptions: {
                        cidVersion: 1 // Use CIDv1 for better compatibility
                    }
                };

                // Upload to IPFS via Pinata
                const result = await this.pinata.pinFileToIPFS(stream, options);
                
                console.log(`✅ PDF uploaded to IPFS successfully: ${result.IpfsHash}`);

                // Get all gateway URLs for redundancy
                const urls = this.getIPFSUrls(result.IpfsHash);
                
                return {
                    ipfsHash: result.IpfsHash,
                    ipfsUrl: urls.primary,
                    fallbackUrls: urls.fallbacks,
                    timestamp: result.Timestamp,
                    size: pdfBuffer.length,
                    attempt: attempt,
                    pinnedUntil: null // Pinata pins indefinitely by default
                };

            } catch (error) {
                lastError = error;
                console.error(`❌ IPFS Upload Attempt ${attempt} Failed:`, error.message);
                
                // Determine if error is retryable
                const isRetryable = 
                    error.message.includes('timeout') ||
                    error.message.includes('ECONNREFUSED') ||
                    error.message.includes('network') ||
                    error.message.includes('ETIMEDOUT');
                
                if (!isRetryable) {
                    console.error('   Non-retryable error detected, stopping attempts');
                    break;
                }
                
                // Wait before retry (exponential backoff: 2s, 4s, 8s)
                if (attempt < maxRetries) {
                    const waitTime = Math.pow(2, attempt) * 1000;
                    console.log(`⏳ Retrying in ${waitTime/1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
        }
        
        // All attempts failed
        console.error(`❌ IPFS Upload Failed after ${maxRetries} attempts:`, lastError.message);
        console.error('   Certificate will be saved without IPFS backup');
        return null;
    }

    /**
     * Upload JSON metadata to IPFS
     * @param {Object} certData - Certificate data object
     * @param {number} maxRetries - Maximum retry attempts
     * @returns {Promise<Object|null>} Upload result or null
     */
    async uploadMetadata(certData, maxRetries = 3) {
        let lastError = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`📤 Uploading metadata for ${certData.certificateId} (attempt ${attempt})`);
                
                const metadata = {
                    certificateId: certData.certificateId,
                    studentName: certData.studentName,
                    studentEmail: certData.studentEmail,
                    eventName: certData.eventName,
                    eventDate: certData.eventDate,
                    issuer: certData.issuedBy,
                    blockchainHash: certData.certificateHash,
                    transactionHash: certData.transactionHash,
                    issuedAt: new Date().toISOString(),
                    version: '1.0',
                    schema: 'https://schema.org/EducationalOccupationalCredential'
                };

                const options = {
                    pinataMetadata: {
                        name: `${certData.certificateId}-metadata.json`,
                        keyvalues: {
                            type: 'metadata',
                            certificateId: certData.certificateId
                        }
                    }
                };

                const result = await this.pinata.pinJSONToIPFS(metadata, options);

                console.log(`✅ Metadata uploaded to IPFS: ${result.IpfsHash}`);
                
                const urls = this.getIPFSUrls(result.IpfsHash);

                return {
                    ipfsHash: result.IpfsHash,
                    ipfsUrl: urls.primary,
                    fallbackUrls: urls.fallbacks
                };

            } catch (error) {
                lastError = error;
                console.error(`❌ Metadata Upload Attempt ${attempt} Failed:`, error.message);
                
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            }
        }
        
        console.error('❌ Metadata Upload Failed:', lastError.message);
        return null;
    }
    
    /**
     * Fetch file from IPFS with automatic gateway fallback
     * Tries primary gateway first, then falls back to alternatives
     * @param {string} ipfsHash - IPFS content identifier
     * @param {number} timeoutMs - Timeout per gateway attempt
     * @returns {Promise<Response>} Fetch response object
     */
    async getFile(ipfsHash, timeoutMs = 10000) {
        const urls = this.getIPFSUrls(ipfsHash);
        
        console.log(`🔍 Fetching ${ipfsHash} from IPFS...`);
        
        // Try each gateway in order
        for (let i = 0; i < urls.allUrls.length; i++) {
            const url = urls.allUrls[i];
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
                
                console.log(`  Trying gateway ${i + 1}/${urls.allUrls.length}...`);
                const response = await fetch(url, { signal: controller.signal });
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    console.log(`✅ Retrieved from: ${this.gateways[i]}`);
                    return response;
                }
                
                console.warn(`  ⚠️ Gateway returned ${response.status}`);
            } catch (error) {
                console.warn(`  ❌ Gateway failed: ${error.message}`);
                continue;
            }
        }
        
        throw new Error(`Failed to fetch ${ipfsHash} from all ${urls.allUrls.length} IPFS gateways`);
    }

    /**
     * Unpin content from Pinata (cleanup old files)
     * @param {string} ipfsHash - Hash to unpin
     * @returns {Promise<boolean>} Success status
     */
    async unpinFile(ipfsHash) {
        try {
            await this.pinata.unpin(ipfsHash);
            console.log(`🗑️ Unpinned: ${ipfsHash}`);
            return true;
        } catch (error) {
            console.error(`❌ Unpin failed for ${ipfsHash}:`, error.message);
            return false;
        }
    }

    /**
     * List all pinned files with optional filters
     * @param {Object} filters - Pinata filter options
     * @returns {Promise<Array>} Array of pinned files
     */
    async listPinnedFiles(filters = {}) {
        try {
            const result = await this.pinata.pinList(filters);
            console.log(`📋 Found ${result.rows.length} pinned files`);
            return result.rows;
        } catch (error) {
            console.error('❌ Failed to list pinned files:', error.message);
            return [];
        }
    }

    /**
     * Get storage usage statistics from Pinata
     * @returns {Promise<Object|null>} Storage stats
     */
    async getStorageStats() {
        try {
            const files = await this.listPinnedFiles();
            const totalSize = files.reduce((sum, file) => sum + file.size, 0);
            
            const stats = {
                fileCount: files.length,
                totalSize: totalSize,
                totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
                totalSizeGB: (totalSize / 1024 / 1024 / 1024).toFixed(3)
            };
            
            console.log(`📊 Storage Stats: ${stats.fileCount} files, ${stats.totalSizeMB} MB`);
            return stats;
        } catch (error) {
            console.error('❌ Failed to get storage stats:', error.message);
            return null;
        }
    }

    /**
     * Batch upload multiple files
     * @param {Array} files - Array of {buffer, metadata} objects
     * @returns {Promise<Array>} Array of upload results
     */
    async batchUpload(files) {
        console.log(`📤 Starting batch upload of ${files.length} files...`);
        
        const results = [];
        let successCount = 0;
        let failCount = 0;
        
        for (let i = 0; i < files.length; i++) {
            console.log(`Processing file ${i + 1}/${files.length}...`);
            try {
                const result = await this.uploadCertificate(files[i].buffer, files[i].metadata);
                results.push({ success: true, result, index: i });
                successCount++;
            } catch (error) {
                results.push({ success: false, error: error.message, index: i });
                failCount++;
            }
        }
        
        console.log(`✅ Batch upload complete: ${successCount} succeeded, ${failCount} failed`);
        return results;
    }

    /**
     * Verify file integrity on IPFS
     * @param {string} ipfsHash - Hash to verify
     * @returns {Promise<boolean>} True if file is accessible
     */
    async verifyFile(ipfsHash) {
        try {
            console.log(`🔍 Verifying IPFS file: ${ipfsHash}`);
            const response = await this.getFile(ipfsHash, 5000);
            const exists = response && response.ok;
            console.log(exists ? '✅ File verified' : '❌ File not found');
            return exists;
        } catch (error) {
            console.error('❌ Verification failed:', error.message);
            return false;
        }
    }
}

// Export singleton instance
module.exports = new IPFSService();