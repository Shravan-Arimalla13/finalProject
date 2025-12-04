// In server/utils/blockchain.js
// In server/utils/blockchain.js
const { ethers } = require('ethers');
require('dotenv').config();

// 1. Get info from .env
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const RPC_URL = process.env.BLOCKCHAIN_RPC_URL;
let PRIVATE_KEY = process.env.PRIVATE_KEY; // Read private key from .env

// --- FIX: AUTO-SWITCH TO HARDHAT TEST KEY FOR LOCALHOST ---
// This prevents the "invalid private key" error when running locally
if (RPC_URL && (RPC_URL.includes("127.0.0.1") || RPC_URL.includes("localhost"))) {
    console.log("⚠️ Localhost detected. Using Hardhat Test Account #0.");
    // This is the well-known private key for Account #0 in Hardhat
    // This key always has 10,000 test ETH for local minting
    PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
}
// -----------------------------------------------------------

if (!PRIVATE_KEY || !CONTRACT_ADDRESS || !RPC_URL) {
    console.error("Missing Blockchain Config (Check .env):", {
        hasKey: !!PRIVATE_KEY,
        hasAddress: !!CONTRACT_ADDRESS,
        hasRPC: !!RPC_URL
    });
    // Crash the app if critical config is missing
    throw new Error("CRITICAL: Blockchain configuration incomplete.");
}

// 2. Get the ABI
const contractArtifact = require('../artifacts/contracts/CredentialNFT.sol/CredentialNFT.json');
const CONTRACT_ABI = contractArtifact.abi;

// 3. Connect to the blockchain
const provider = new ethers.JsonRpcProvider(RPC_URL);

// 4. Get the "signer" (Hardhat key for local, your key for remote)
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

// 5. Create the "Contract" object
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

console.log('Blockchain helper loaded.');
console.log(`Connected to contract at: ${CONTRACT_ADDRESS}`);
console.log(`Operating as Wallet: ${signer.address}`); 

// --- MINTING FUNCTION ---
exports.mintNFT = async (studentWalletAddress, certificateHash) => {
    try {
        // FIX: NORMALIZE WALLET ADDRESS BEFORE MINTING 
        const studentWallet = getAddress(studentWalletAddress); // Assuming getAddress is imported

        const tx = await contract.mintCertificate(
            studentWallet, 
            '0x' + certificateHash 
        );
        console.log(`Transaction sent: ${tx.hash}. Waiting...`);
        
        const receipt = await tx.wait(); 
        
        let tokenId = null;

        for (const log of receipt.logs) {
            try {
                const parsedLog = contract.interface.parseLog(log);
                if (parsedLog && parsedLog.name === 'CertificateMinted') {
                    tokenId = parsedLog.args.tokenId.toString();
                    break; 
                }
            } catch (e) { continue; }
        }

        if (!tokenId) {
            // FALLBACK: Fetch latest ID (Assumes a fresh deploy/reset if local)
            const currentCounter = await contract.tokenIdCounter();
            tokenId = currentCounter.toString();
        }
        
        return {
            transactionHash: tx.hash,
            tokenId: tokenId
        };

    } catch (error) {
        console.error('Blockchain minting failed:', error);
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