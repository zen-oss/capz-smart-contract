pragma solidity ^0.5.7;

import "./ZenICO.sol";

contract CAPZTest is CAPZ {
  constructor (uint256 _startOn, uint256 _endOn, uint256 _goalLimitMinInWei, uint256 _goalLimitMaxInWei) CAPZ(_startOn, _endOn, _goalLimitMinInWei, _goalLimitMaxInWei) public { }

  function grantTokens(uint256 receivedAmount) public {
    grantTokens(receivedAmount, msg.sender);
  }

  function grantTokens(uint256 receivedAmount, address beneficiary) public {
    uint256 newBalance = balanceInWei.add(receivedAmount);
    uint256 newRefundBalance = refunds[beneficiary].add(receivedAmount);

    _mint(beneficiary, receivedAmount);
    refunds[beneficiary] = newRefundBalance;
    balanceInWei = newBalance;
  }

  function myEscrowRefundBalance() public view returns (uint256) {
    return escrowRefundBalanceOf(msg.sender);
  }

  function escrowRefundBalanceOf(address addr) public view returns (uint256) {
    return refunds[addr];
  }
}

contract TransferEth {
  function () external payable {}

  function moveTo(address payable to) public {
    selfdestruct(to);
  }
}

contract EvilReentrant {
  CAPZTest ico;
  bool shouldReenter;

  constructor (address payable _ico) public {
    ico = CAPZTest(_ico);
  }

  function () external payable {
    if (shouldReenter) {
      shouldReenter = false;
      ico.escrowRefund();
    }
  }

  function tryEscrowRefund() public {
    shouldReenter = false;
    ico.escrowRefund();
  }

  function tryEscrowSteal() public {
    shouldReenter = true;
    ico.escrowRefund();
  }
}
