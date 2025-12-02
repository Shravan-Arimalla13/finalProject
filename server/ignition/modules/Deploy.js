// In server/ignition/modules/Deploy.js
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("CredentialNFTModule", (m) => {
  console.log("Preparing to deploy CredentialNFT...");

  // This must match your new contract's name in the 'contracts' folder
  const nft = m.contract("CredentialNFT"); 

  // Make sure this variable matches the one above
  return { nft }; 
});