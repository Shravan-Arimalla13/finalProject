// In server/hardhat.config.js
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config(); // Load .env variables

// CRITICAL: Ensure these exist, or default to an empty string to prevent crashes.
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY; // We only need to check if it exists

module.exports = {
  solidity: "0.8.20",
  // --- FIX: SET DEFAULT NETWORK TO HARDHAT'S LOCAL NODE ---
  defaultNetwork: "hardhat", 
  // --------------------------------------------------------
  networks: {
    hardhat: {
        // This is the local test environment Hardhat runs when you use 'npx hardhat node'
        chainId: 31337
    },
    localhost: {
        // This links the deployer script back to the running node
        url: "http://127.0.0.1:8545"
    },
    sepolia: {
      // FIX: Use optional chaining here. If URL is missing, use a safe string.
      url: SEPOLIA_RPC_URL, 
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
};