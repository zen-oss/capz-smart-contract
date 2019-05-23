module.exports = {
  networks: {
    test: {
     host: "127.0.0.1",
     port: 8545,
     network_id: "*",       // Any network (default: none)
     gas: 6000000,
    },
  },

  mocha: {},

  compilers: {
    solc: {
      version: "0.5.8",
      settings: {
       optimizer: {
         enabled: false,
         runs: 200
       },
      }
    }
  }
}
