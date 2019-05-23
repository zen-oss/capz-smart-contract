# getting started - contracts

this assumes you've installed `go-ethereum` and `solidity`. Please
refer to README for more details.

The first thing to do is to start the development environment:

```shell
$ ./dev/geth console
```

In parallel, create and compile a simple contract. Create a file
/tmp/capz-contract-example/contract.sol with the following contents:

```solidity
pragma solidity ^0.5.7;
contract CapzContractExample {
  function double(int a) public pure returns(int) {
    return 2*a;
  }
}
```

Compile the contract. After this command you should have two new files
available, /tmp/capz-contract-example/CapzContractExample.{abi,bin}.

```shell
$ solc -o /tmp/capz-contract-example/dist \
       --bin \
       --abi \
       /tmp/capz-contract-example/contract.sol
```

Deploying the contract. Using the console we've create previously
using `/dev/geth console`:

```
> capz_contract_abi = eth.contract(<contents of CazpContractExample.abi>)
> capz_contract_txn = capz_contract_abi.new(
    { from: eth.accounts[0]
    , data: "0x<contents of CapzContractExample.bin>"
    , gas: 1000000
    }
  )
)
```

Some information should be available on the screen now. Take notice of
the following line, which should contain the contract's address (the
value will vary on your machine):

```
INFO [04-24|17:48:48.693] Submitted contract creation              fullhash=0xbf41190a77cd56081554d4dd664010c3bd579f043834585fda25e60f58ac173e contract=0x7333B1bf1Ad25b59E682Aeb1dADeD2b9F4bc2609
```

Now instantiate and use your contract:

```
> capz_contract = capz_contract_abi.at("0x7333B1bf1Ad25b59E682Aeb1dADeD2b9F4bc2609")
> capz_contract.double(10)
20

> txn_hash = eth.sendTransaction(
  {from: eth.accounts[0]
   to: "0x7333B1bf1Ad25b59E682Aeb1dADeD2b9F4bc2609",
   data: capz_contract.double.getData(10),
   gas: 1000000
  }
)
> eth.getTransactionReceipt(txn_hash)
...
status: "0x1", // <- success
...
```
