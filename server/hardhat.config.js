// In server/hardhat.config.js
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config(); // Load .env variables

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY; // Your MetaMask private key

module.exports = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY], // This account pays for deployment
    },
  },
};