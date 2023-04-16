require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
  networks: {
    //   hardhat: {},

    sepolia: {
      // chainId: 80001,
      url: "https://sepolia.infura.io/v3/752155e79a924e21b1477a5502103ca8",
      accounts: ["5abdaa9d1f6a5a45eb6e6d23c35127c0982d59ddd1660daa1a92cf6cfbbd0eb3"],
    },
  },
};
