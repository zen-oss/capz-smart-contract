if (web3.eth.accounts.length == 1) {
  personal.newAccount("");
  web3.eth.sendTransaction({from: web3.eth.accounts[0], to: web3.eth.accounts[1], value: 6e23, gas: 1e6});
}
