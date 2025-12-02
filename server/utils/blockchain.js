// In server/utils/blockchain.js
const { ethers } = require('ethers');
require('dotenv').config();

// 1. Get info from .env
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const RPC_URL = process.env.BLOCKCHAIN_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY; // <--- NEW: Read from .env

if (!PRIVATE_KEY || !CONTRACT_ADDRESS || !RPC_URL) {
    console.error("Missing Blockchain Config (Check .env):", {
        hasKey: !!PRIVATE_KEY,
        hasAddress: !!CONTRACT_ADDRESS,
        hasRPC: !!RPC_URL
    });
}

// 2. Get the ABI
const contractArtifact = require('../artifacts/contracts/CredentialNFT.sol/CredentialNFT.json');
const CONTRACT_ABI = contractArtifact.abi;

// 3. Connect to the blockchain
const provider = new ethers.JsonRpcProvider(RPC_URL);

// 4. Get the "signer" (Your Real Wallet)
// Use the private key from .env instead of the hardcoded one
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

// 5. Create the "Contract" object
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

console.log('Blockchain helper loaded (NFT Mode).');
console.log(`Connected to NFT contract at: ${CONTRACT_ADDRESS}`);
console.log(`Operating as Wallet: ${signer.address}`); // Log who we are logged in as

// --- MINTING FUNCTION ---
exports.mintNFT = async (studentWalletAddress, certificateHash) => {
    try {
        console.log(`Minting NFT for hash: ${certificateHash}`);
        
        // Call mintCertificate
        // Note: '0x' + certificateHash ensures it's treated as bytes32
        const tx = await contract.mintCertificate(
            studentWalletAddress, 
            '0x' + certificateHash 
        );
        
        console.log(`Transaction sent: ${tx.hash}. Waiting for confirmation...`);
        
        const receipt = await tx.wait(); // Wait for mining
        
        // Find Token ID from events
        // We look for the TransferSingle event or CertificateMinted event
        // CertificateMinted(uint256 indexed tokenId, bytes32 certHash, address indexed studentWallet)
        // It is usually the last event log
        let tokenId = null;
        
        // Try to find the specific event "CertificateMinted"
        const event = receipt.logs.find(log => {
             try {
                 const parsed = contract.interface.parseLog(log);
                 return parsed && parsed.name === 'CertificateMinted';
             } catch (e) { return false; }
        });

        if (event) {
            const parsed = contract.interface.parseLog(event);
            tokenId = parsed.args.tokenId.toString();
        } else {
            // Fallback: simple counter assumption or check other logs
            console.warn("Could not parse TokenID from logs, using transaction hash reference.");
            tokenId = "PENDING"; 
        }
        
        console.log(`✅ NFT MINTED! Token ID: ${tokenId}, TX Hash: ${tx.hash}`);
        
        return {
            transactionHash: tx.hash,
            tokenId: tokenId
        };

    } catch (error) {
        console.error('Blockchain minting failed:', error);
        // Check for specific revert reasons
        if (error.code === 'CALL_EXCEPTION') {
            console.error("Transaction reverted! Check if Sender is Owner.");
        }
        throw new Error('Blockchain transaction failed.');
    }
};

// --- REVOKE FUNCTION ---
exports.revokeByHash = async (certificateHash) => {
    try {
        console.log(`Sending REVOKE for hash: ${certificateHash}`);
        const tx = await contract.revokeCertificateByHash(
            '0x' + certificateHash
        );
        await tx.wait();
        console.log(`✅ Hash successfully REVOKED! TX Hash: ${tx.hash}`);
        return tx.hash;
    } catch (error) {
        console.error('Blockchain revocation failed:', error.message);
        throw new Error('Blockchain revocation failed.');
    }
};

// --- VERIFICATION FUNCTION ---
exports.isHashValid = async (certificateHash) => {
    try {
        const isValid = await contract.isHashValid(
            '0x' + certificateHash
        );
        return { exists: true, isRevoked: !isValid }; 
    } catch (error) {
        console.error('Blockchain verification failed:', error.message);
        return { exists: false, isRevoked: false };
    }
};