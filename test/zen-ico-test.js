// -*- js-indent-level: 2; -*-

const assert = require("chai").assert;
const truffle_assert = require('truffle-assertions');

const Status = {
  NOT_OPEN: 0,
  OPEN: 1,
  GOAL_REACHED: 2,
  GOAL_NOT_REACHED: 3,
};

const CAPZ = artifacts.require("CAPZTest");
const TransferEth = artifacts.require("TransferEth");
const EvilReentrant = artifacts.require("EvilReentrant");

var balance_of = async function (address) {
  let balance = await web3.eth.getBalance(address);
  return BigInt(balance);
};

var transfer_eth = async function (address, amount) {
  let contract = await TransferEth.new();
  await contract.send(amount);
  await contract.moveTo(address);
};

var grant_tokens = async function (contract, amount) {
  await transfer_eth(contract.address, amount);
  await contract.grantTokens(amount);
};

var grant_tokens_to = async function (contract, address, amount) {
  await transfer_eth(contract.address, amount);
  await contract.grantTokens(amount, address);
};

const Fixtures = {
  goal_not_reached_contract: async function (goal) {
    let now = Math.round(new Date().getTime() / 1000);
    let contract = await CAPZ.new(now - 600, now - 300, goal, goal + 1);

    return contract;
  },

  min_goal_reached_contract: async function (goal) {
    let now = Math.round(new Date().getTime() / 1000);
    let contract = await CAPZ.new(now - 600, now - 300, goal, goal + 1);

    await contract.grantTokens(goal);

    return contract;
  },

  max_goal_reached_contract: async function (goal) {
    let now = Math.round(new Date().getTime() / 1000);
    let contract = await CAPZ.new(now - 600, now - 300, goal, goal + 1);

    await contract.grantTokens(goal + 1);

    return contract;
  },

  not_open_contract: async function (goal) {
    let now = Math.round(new Date().getTime() / 1000);
    let contract = await CAPZ.new(now + 300, now + 600, goal, goal + 1);

    return contract;
  },

  open_contract: async function (goal) {
    let now = Math.round(new Date().getTime() / 1000);
    let contract = await CAPZ.new(now - 300, now + 300, goal, goal + 1);

    return contract;
  },
};

contract("CAPZ", async ([account, other_account]) => {
  describe("status", async () => {
    it("not_open status", async () => {
      let contract = await Fixtures.not_open_contract(1);
      let status = await contract.status.call();
      assert.equal(Status.NOT_OPEN, status);
    });

    it("open status", async () => {
      let contract = await Fixtures.open_contract(1);
      let status = await contract.status.call();
      assert.equal(Status.OPEN, status);
    });

    it("goal_reached status", async () => {
      let min_goal_contract = await Fixtures.min_goal_reached_contract(1);
      let min_goal_status = await min_goal_contract.status.call();
      assert.equal(Status.GOAL_REACHED, min_goal_status);

      let max_goal_contract = await Fixtures.max_goal_reached_contract(1);
      let max_goal_status = await max_goal_contract.status.call();
      assert.equal(Status.GOAL_REACHED, max_goal_status);
    });

    it("goal not reached status", async () => {
      let contract = await Fixtures.goal_not_reached_contract(1);
      let status = await contract.status.call();
      assert.equal(Status.GOAL_NOT_REACHED, status);
    });
  });

  describe("escrowRefund", async () => {
    it("can't escrowRefund if crowsale status is not goalNotReached", async () => {
      let not_open_contract = await Fixtures.not_open_contract(1);
      await grant_tokens(not_open_contract, 1);
      await truffle_assert.reverts(not_open_contract.escrowRefund());

      let open_contract = await Fixtures.open_contract(1);
      await grant_tokens(open_contract, 1);
      await truffle_assert.reverts(open_contract.escrowRefund());

      let min_goal_reached_contract = await Fixtures.min_goal_reached_contract(1);
      await truffle_assert.reverts(min_goal_reached_contract.escrowRefund());

      let max_goal_reached_contract = await Fixtures.max_goal_reached_contract(1);
      await truffle_assert.reverts(max_goal_reached_contract.escrowRefund());
    });

    it("can escrowRefund when only when status = GOAL_NOT_REACHED", async () => {
      let contract = await Fixtures.goal_not_reached_contract(2);
      await grant_tokens(contract, 1);

      let balance = await web3.eth.getBalance(contract.address);
      let escrowRefund_balance = await contract.myEscrowRefundBalance();
      let account_balance = await balance_of(account);

      await contract.escrowRefund();

      let new_balance = await web3.eth.getBalance(contract.address);
      let new_escrowRefund_balance = await contract.myEscrowRefundBalance();
      let new_account_balance = await balance_of(account);

      assert.equal(1, escrowRefund_balance.valueOf(), "escrowRefund_balance");
      assert.equal(1, balance.valueOf(), "balance");
      assert.equal(0, new_escrowRefund_balance.valueOf(), "new_escrowRefund_balance");
      assert.equal(0, new_balance.valueOf(), "new_balance");
      assert.equal(1, (new_account_balance - account_balance).valueOf(), "new_account_balance - account_balance");
    });
  });

  describe("buyTokens", async () => {
    it("can't call when status is not open", async () => {
      let not_open_contract = await Fixtures.not_open_contract(1);
      await truffle_assert.reverts(not_open_contract.buyTokens({value: 1}));

      let goal_not_reached_contract = await Fixtures.goal_not_reached_contract(100);
      await truffle_assert.reverts(goal_not_reached_contract.buyTokens({value: 1}));

      let min_goal_reached_contract = await Fixtures.min_goal_reached_contract(100);
      await truffle_assert.reverts(min_goal_reached_contract.buyTokens({value: 1}));

      let max_goal_reached_contract = await Fixtures.max_goal_reached_contract(100);
      await truffle_assert.reverts(max_goal_reached_contract.buyTokens({value: 1}));
    });

    it("can buy tokens when status is open", async () => {
      let contract = await Fixtures.open_contract(1);
      let contract_balance = await balance_of(contract.address);
      let account_balance = await balance_of(account);
      let tokens_balance = await contract.balanceOf.call(account);

      let tx = await contract.buyTokens({value: 1});
      truffle_assert.eventNotEmitted(tx, "Approval");
      truffle_assert.eventEmitted(tx, "Transfer", (event) => {
        return event.from == 0 && event.to == account && event.value == 1;
      });

      let new_contract_balance = await balance_of(contract.address);
      let new_account_balance = await balance_of(account);
      let new_tokens_balance = await contract.balanceOf.call(account);

      assert.equal(1, (account_balance - new_account_balance).valueOf(), "account_balance - new_account_balance");
      assert.equal(0, contract_balance.valueOf(), "contract_balance");
      assert.equal(1, new_contract_balance.valueOf(), "new_contract_balance");

      assert.equal(0, tokens_balance.valueOf(), "tokens_balance");
      assert.equal(1, new_tokens_balance.valueOf(), "new_tokens_balance");
    });

    it("open contract is closed when max goal is reached", async () => {
      let contract = await Fixtures.open_contract(1);

      await contract.buyTokens({value: 2});

      let status = await contract.status();
      assert.equal(Status.GOAL_REACHED, status);
    });

    it("can buy more than hard goal allows", async () => {
      let contract = await Fixtures.open_contract(1);

      await contract.buyTokens({value: 5});

      let status = await contract.status();
      assert.equal(Status.GOAL_REACHED, status);
    });
  });

  describe("escrowWithdraw", async () => {
    it("can not escrowWithdraw before contact is closed", async () => {
      let not_open_contract = await Fixtures.not_open_contract(1);
      await transfer_eth(not_open_contract.address, 1);
      await truffle_assert.reverts(not_open_contract.escrowWithdraw());

      let open_contract = await Fixtures.open_contract(1);
      await transfer_eth(open_contract.address, 1);
      await truffle_assert.reverts(open_contract.escrowWithdraw());

      let goal_not_reached_contract = await Fixtures.goal_not_reached_contract(1);
      await transfer_eth(open_contract.address, 1);
      await truffle_assert.reverts(goal_not_reached_contract.escrowWithdraw());
    });

    it ("can escrowWithdraw when status = GOAL_REACHED | min-goal", async () => {
      let min_goal_reached_contract = await Fixtures.min_goal_reached_contract(1);
      await transfer_eth(min_goal_reached_contract.address, 1);

      let balance = await balance_of(account);
      let token_balance = await min_goal_reached_contract.balanceOf(account);
      let contract_balance = await balance_of(min_goal_reached_contract.address);

      await min_goal_reached_contract.escrowWithdraw();

      let new_balance = await balance_of(account);
      let new_token_balance = await min_goal_reached_contract.balanceOf(account);
      let new_contract_balance = await balance_of(min_goal_reached_contract.address);

      assert.equal(1, token_balance, "token balance");
      assert.equal(1, contract_balance.valueOf(), "contract balance");

      assert.equal(1, new_token_balance, "new token balance");
      assert.equal(0, new_contract_balance.valueOf(), "new contract balance");
      assert.equal(1, (new_balance - balance).valueOf(), "new_balance - balance");
    });

    it ("can escrowWithdraw when status = GOAL_REACHED | max-goal", async () => {
      let min_goal_reached_contract = await Fixtures.min_goal_reached_contract(1);
      await transfer_eth(min_goal_reached_contract.address, 1);

      let balance = await balance_of(account);
      let token_balance = await min_goal_reached_contract.balanceOf(account);
      let contract_balance = await balance_of(min_goal_reached_contract.address);

      await min_goal_reached_contract.escrowWithdraw();

      let new_balance = await balance_of(account);
      let new_token_balance = await min_goal_reached_contract.balanceOf(account);
      let new_contract_balance = await balance_of(min_goal_reached_contract.address);

      assert.equal("1", token_balance.toString(), "token balance");
      assert.equal("1", contract_balance.toString(), "contract balance");

      assert.equal("1", new_token_balance.toString(), "new token balance");
      assert.equal("0", new_contract_balance.toString(), "new contract balance");
      assert.equal("1", (new_balance - balance).toString(), "new_balance - balance");
    });
  });

  describe("alterGoal", async () => {
    it("should allow to change goals | NotOpen", async () => {
      let contract = await Fixtures.not_open_contract(1);

      let tx = await contract.alterGoal(99, 999);

      let new_min_goal = await contract.goalLimitMinInWei();
      let new_max_goal = await contract.goalLimitMaxInWei();

      assert.equal(new_min_goal.toString(), "99", "new_min_goal");
      assert.equal(new_max_goal.toString(), "999", "new_max_goal");
      truffle_assert.eventEmitted(tx, "GoalChange", (event) => {
        return event.goalLimitMinInWei == 99 && event.goalLimitMaxInWei == 999;
      });
    });

    it("should allow to change goals | Open", async () => {
      let contract = await Fixtures.open_contract(1);

      let tx = await contract.alterGoal(99, 999);

      let new_min_goal = await contract.goalLimitMinInWei();
      let new_max_goal = await contract.goalLimitMaxInWei();

      assert.equal(new_min_goal.toString(), "99", "new_min_goal");
      assert.equal(new_max_goal.toString(), "999", "new_max_goal");
      truffle_assert.eventEmitted(tx, "GoalChange", (event) => {
        return event.goalLimitMinInWei == 99 && event.goalLimitMaxInWei == 999;
      });
    });

    it("should not allow to change goals | GoalReached | min", async () => {
      let contract = await Fixtures.min_goal_reached_contract(1);

      await truffle_assert.reverts(contract.alterGoal(99, 999));
    });

    it("should not allow to change goals | GoalReached | max", async () => {
      let contract = await Fixtures.max_goal_reached_contract(1);

      await truffle_assert.reverts(contract.alterGoal(99, 999));
    });

    it("should not allow to change goals | GoalNotReached", async () => {
      let contract = await Fixtures.goal_not_reached_contract(1);

      await truffle_assert.reverts(contract.alterGoal(99, 999));
    });
  });

  describe("escrowClaim", async () => {
    it("should not escrowClaim when goal is not reached", async () => {
      let not_open_contract = await Fixtures.not_open_contract(1);
      await truffle_assert.reverts(not_open_contract.escrowClaim(1));

      let open_contract = await Fixtures.open_contract(1);
      await grant_tokens(open_contract, 1);
      await truffle_assert.reverts(open_contract.escrowClaim(1));

      let goal_not_reached_contract = await Fixtures.goal_not_reached_contract(100);
      await truffle_assert.reverts(goal_not_reached_contract.escrowClaim(1));
    });

    it("should escrowClaim when goal is reached and has funds | min goal", async () => {
      let min_goal_reached_contract = await Fixtures.min_goal_reached_contract(100);
      await grant_tokens_to(min_goal_reached_contract, other_account, 100);

      let other_token_balance = await min_goal_reached_contract.balanceOf(other_account);
      let our_token_balance = await min_goal_reached_contract.balanceOf(account);

      let tx = await min_goal_reached_contract.escrowClaim(1, {from: other_account});

      let new_other_token_balance = await min_goal_reached_contract.balanceOf(other_account);
      let new_our_token_balance = await min_goal_reached_contract.balanceOf(account);

      assert.equal((other_token_balance - new_other_token_balance).toString(), "1", "new other token balance");
      assert.equal((new_our_token_balance - our_token_balance).toString(), "1", "new our token balance");

      await truffle_assert.eventEmitted(tx, "Transfer", (event) => {
        return event.from == other_account && event.to == account && event.value == 1;
      });
      await truffle_assert.eventEmitted(tx, "Claim", (event) => {
        return event.beneficiary == other_account && event.value == 1;
      });
    });

    it("should escrowClaim when goal is reached and has funds | max goal", async () => {
      let max_goal_reached_contract = await Fixtures.max_goal_reached_contract(100);
      await grant_tokens_to(max_goal_reached_contract, other_account, 100);

      let other_token_balance = await max_goal_reached_contract.balanceOf(other_account);
      let our_token_balance = await max_goal_reached_contract.balanceOf(account);

      let tx = await max_goal_reached_contract.escrowClaim(1, {from: other_account});

      let new_other_token_balance = await max_goal_reached_contract.balanceOf(other_account);
      let new_our_token_balance = await max_goal_reached_contract.balanceOf(account);

      assert.equal((other_token_balance - new_other_token_balance).toString(), "1", "new other token balance");
      assert.equal((new_our_token_balance - our_token_balance).toString(), "1", "new our token balance");

      await truffle_assert.eventEmitted(tx, "Transfer", (event) => {
        return event.from == other_account && event.to == account && event.value == 1;
      });
      await truffle_assert.eventEmitted(tx, "Claim", (event) => {
        return event.beneficiary == other_account && event.value == 1;
      });
    });

    it("should not escrowClaim more than is owned", async () => {
      let max_goal_reached_contract = await Fixtures.max_goal_reached_contract(100);
      await grant_tokens_to(max_goal_reached_contract, other_account, 100);

      await truffle_assert.reverts(max_goal_reached_contract.escrowClaim(102, {from: other_account}));
    });
  });

  describe("reentrant contract", async () => {
    it("should not escrowRefund twice", async () => {
      let goal_not_reached_contract = await Fixtures.goal_not_reached_contract(100);
      let adversary = await EvilReentrant.new(goal_not_reached_contract.address);
      await grant_tokens_to(goal_not_reached_contract, adversary.address, 1);

      await truffle_assert.reverts(adversary.tryEscrowSteal());

      await adversary.tryEscrowRefund();

      let balance = await balance_of(adversary.address);
      assert.equal(balance.toString(), "1");
    });
  });
});
