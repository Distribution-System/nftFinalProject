require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
  networks: {
    //   hardhat: {},

    sepolia: {
      // chainId: 80001,
      url: "https://goerli.infura.io/v3/752155e79a924e21b1477a5502103ca8",
      accounts: ["df57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e"],
    },
  },
};
