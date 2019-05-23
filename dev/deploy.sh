#!/bin/sh

set -e

input=$1

enum_files () {
  local tmpdir callback
  tmpdir=$1
  callback=$2

  for abi_file in $(find "$tmpdir" -name \*.abi)
  do
    basename=$(basename "$abi_file" .abi)

    abi_data=$(cat "$abi_file")
    bin_data=$(cat "$tmpdir/${basename}.bin")

    contract=$(echo $basename | tr [:upper:] [:lower:])
    abi_name="${contract}_abi"
    txn_name="${contract}_txn"

    $callback
  done
}

deploy_script () {
  echo "/**** $basename ****/"
  echo "$abi_name = eth.contract($abi_data);"
  echo "$txn_name = ${abi_name}.new({from: eth.accounts[0], data: \"0x${bin_data}\", gas: 1000000});"
  echo "$contract = $abi_name.at(eth.getTransactionReceipt(${txn_name}.transactionHash).contractAddress);"
  echo
}

tmpdir=$(mktemp -d) && {
  trap 'rm -rf "$tmpdir"' EXIT

  solc -o "$tmpdir" --bin --abi "$@"

  enum_files "$tmpdir" deploy_script
}
