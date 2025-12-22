// server/utils/blockchain.js - FIXED VERSION
const { ethers } = require('ethers');
const { getAddress } = require('ethers/address');
require('dotenv').config();

// --- Configuration ---
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const RPC_URL = process.env.BLOCKCHAIN_RPC_URL;
let PRIVATE_KEY = process.env.PRIVATE_KEY;

// Auto-switch to Hardhat test key for localhost
if (RPC_URL && (RPC_URL.includes("127.0.0.1") || RPC_URL.includes("localhost"))) {
    console.log("⚠️ Localhost detected. Using Hardhat Test Account #0.");
    PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
}

// Validate configuration
if (!PRIVATE_KEY || !CONTRACT_ADDRESS || !RPC_URL) {
    console.error("❌ Missing Blockchain Config:", {
        hasKey: !!PRIVATE_KEY,
        hasAddress: !!CONTRACT_ADDRESS,
        hasRPC: !!RPC_URL
    });
    throw new Error("CRITICAL: Blockchain configuration incomplete.");
}

// Load contract ABI
const contractArtifact = require('../artifacts/contracts/CredentialNFT.sol/CredentialNFT.json');
const CONTRACT_ABI = contractArtifact.abi;

// Initialize provider and signer
const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

console.log('🔗 Blockchain helper loaded.');
console.log(`📍 Contract: ${CONTRACT_ADDRESS}`);
console.log(`👤 Wallet: ${signer.address}`);

/**
 * Validate blockchain connection and contract deployment
 */
async function validateBlockchainConnection() {
    try {
        // Check if contract is deployed at the address
        const code = await provider.getCode(CONTRACT_ADDRESS);
        if (code === '0x') {
            throw new Error(`No contract deployed at ${CONTRACT_ADDRESS}`);
        }
        
        // Check wallet balance
        const balance = await provider.getBalance(signer.address);
        const balanceInEth = ethers.formatEther(balance);
        
        console.log(`✅ Blockchain Connected`);
        console.log(`💰 Wallet Balance: ${balanceInEth} ETH`);
        
        // Warn if balance is low
        if (parseFloat(balanceInEth) < 0.01) {
            console.warn('⚠️ WARNING: Wallet balance is low. Transactions may fail.');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Blockchain Validation Failed:', error.message);
        throw error;
    }
}

// Run validation on startup
validateBlockchainConnection().catch(err => {
    console.error('❌ CRITICAL: Blockchain not accessible. Server may not function properly.');
});

/**
 * Mint NFT Certificate
 * @param {string} studentWalletAddress - Ethereum address of student
 * @param {string} certificateHash - SHA256 hash of certificate data
 * @returns {Object} Transaction details including tokenId
 */
exports.mintNFT = async (studentWalletAddress, certificateHash) => {
    try {
        // Validate and normalize wallet address
        if (!studentWalletAddress) {
            throw new Error('Student wallet address is required');
        }
        
        const studentWallet = getAddress(studentWalletAddress.toLowerCase());
        
        // Validate hash format
        if (!certificateHash || certificateHash.length !== 64) {
            throw new Error('Invalid certificate hash format');
        }
        
        // Add 0x prefix if not present
        const formattedHash = certificateHash.startsWith('0x') 
            ? certificateHash 
            : '0x' + certificateHash;
        
        console.log(`🎨 Minting NFT for ${studentWallet}...`);
        
        // Estimate gas before sending transaction
        try {
            await contract.mintCertificate.estimateGas(studentWallet, formattedHash);
        } catch (gasError) {
            console.error('❌ Gas estimation failed:', gasError.message);
            throw new Error('Transaction would fail. Check wallet balance and contract state.');
        }
        
        // Send transaction
        const tx = await contract.mintCertificate(studentWallet, formattedHash);
        console.log(`⏳ Transaction submitted: ${tx.hash}`);
        
        // Wait for confirmation
        const receipt = await tx.wait();
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
        
        // Parse logs to get tokenId
        let tokenId = null;
        for (const log of receipt.logs) {
            try {
                const parsedLog = contract.interface.parseLog(log);
                if (parsedLog && parsedLog.name === 'CertificateMinted') {
                    tokenId = parsedLog.args.tokenId.toString();
                    console.log(`🎫 Token ID: ${tokenId}`);
                    break;
                }
            } catch (e) {
                continue;
            }
        }

        // Fallback: fetch latest tokenId from contract
        if (!tokenId) {
            console.warn('⚠️ Could not parse tokenId from logs, fetching from contract...');
            const currentCounter = await contract.tokenIdCounter();
            tokenId = currentCounter.toString();
        }
        
        return {
            transactionHash: tx.hash,
            tokenId: tokenId,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString()
        };

    } catch (error) {
        console.error('❌ Blockchain minting failed:', error.message);
        
        // Provide more specific error messages
        if (error.message.includes('insufficient funds')) {
            throw new Error('Insufficient wallet balance for transaction');
        } else if (error.message.includes('nonce')) {
            throw new Error('Transaction nonce error. Please try again.');
        } else {
            throw new Error(`Blockchain transaction failed: ${error.message}`);
        }
    }
};

/**
 * Revoke Certificate by Hash
 * @param {string} certificateHash - SHA256 hash to revoke
 * @returns {string} Transaction hash
 */
exports.revokeByHash = async (certificateHash) => {
    try {
        if (!certificateHash || certificateHash.length !== 64) {
            throw new Error('Invalid certificate hash format');
        }
        
        const formattedHash = certificateHash.startsWith('0x') 
            ? certificateHash 
            : '0x' + certificateHash;
        
        console.log(`🚫 Revoking certificate with hash: ${formattedHash}`);
        
        // Check if already revoked
        const isValid = await contract.isHashValid(formattedHash);
        if (!isValid) {
            throw new Error('Certificate is already revoked');
        }
        
        const tx = await contract.revokeCertificateByHash(formattedHash);
        console.log(`⏳ Revocation transaction: ${tx.hash}`);
        
        await tx.wait();
        console.log(`✅ Certificate successfully revoked`);
        
        return tx.hash;
    } catch (error) {
        console.error('❌ Blockchain revocation failed:', error.message);
        throw new Error(`Blockchain revocation failed: ${error.message}`);
    }
};

/**
 * Verify Certificate Hash
 * @param {string} certificateHash - SHA256 hash to verify
 * @returns {Object} Verification result
 */
exports.isHashValid = async (certificateHash) => {
    try {
        if (!certificateHash || certificateHash.length !== 64) {
            return { exists: false, isRevoked: false };
        }
        
        const formattedHash = certificateHash.startsWith('0x') 
            ? certificateHash 
            : '0x' + certificateHash;
        
        const isValid = await contract.isHashValid(formattedHash);
        
        return { 
            exists: true, 
            isRevoked: !isValid 
        };
    } catch (error) {
        console.error('❌ Blockchain verification failed:', error.message);
        return { exists: false, isRevoked: false };
    }
};

/**
 * Get current network information
 */
exports.getNetworkInfo = async () => {
    try {
        const network = await provider.getNetwork();
        const blockNumber = await provider.getBlockNumber();
        const balance = await provider.getBalance(signer.address);
        
        return {
            chainId: network.chainId.toString(),
            name: network.name,
            blockNumber: blockNumber,
            walletAddress: signer.address,
            balance: ethers.formatEther(balance)
        };
    } catch (error) {
        console.error('❌ Failed to get network info:', error.message);
        return null;
    }
};

// Export provider and contract for advanced usage
exports.provider = provider;
exports.contract = contract;
exports.signer = signer;