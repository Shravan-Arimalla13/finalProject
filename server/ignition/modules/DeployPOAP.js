const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

    module.exports = buildModule("POAPModule", (m) => {
      const poap = m.contract("POAPCredential");
      return { poap };
    });
   