# capz-smart-contract

## dev environment

the dev environment requires:

* geth (Go client)

* solidity compiler

### Initializing the test environment

```
$ make dev
```

There should be two addresses with lots of funds [your output may
vary].

```
> eth.accounts
["0x80622fc312532705572ee0d5d731d9980c827ed2", "0xbd5ceb5bd92daa75f114e7cdd84f886e943c10c1"]

> web3.fromWei(eth.getBalance(eth.accounts[0]), "ether")
1e59
```

### install scripts

* archlinux

```shell
$ pacman -Sy solidity go-ethereum
```

### Helper deploy script

```shell
$ dev/deploy.sh CONTRACT
```

To build with optimizations:

```shell
$ dev/deploy.sh --optimize --optimize-runs=200 CONTRACT
```

## emacs configuration

* solidity-mode

## see also

* https://ethereum.gitbooks.io/frontier-guide/content/

* http://ethdocs.org/en/latest/index.html

* https://solidity.readthedocs.io/en/latest/

Copyright © 2019 Zen Finance Ltda.
