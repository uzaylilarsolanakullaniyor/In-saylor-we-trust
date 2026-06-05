// ============================================================
// Tests for SentimentVoting. Run with: npm test
// Uses Hardhat's local chain + time-travel helpers to test cooldown.
// ============================================================

import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

// Mirror of the Solidity enum.
const Sentiment = { None: 0, Bullish: 1, Bearish: 2 } as const;
const COOLDOWN = 60 * 60; // 1 hour, matches CHANGE_COOLDOWN

async function deploy() {
  const [owner, alice, bob] = await ethers.getSigners();
  const factory = await ethers.getContractFactory("SentimentVoting");
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  return { contract, owner, alice, bob };
}

describe("SentimentVoting", () => {
  it("records a first vote and updates the tally", async () => {
    const { contract, alice } = await deploy();

    await contract.connect(alice).vote(0, Sentiment.Bullish);

    const [bull, bear, total] = await contract.getResults(0);
    expect(bull).to.equal(1n);
    expect(bear).to.equal(0n);
    expect(total).to.equal(1n);
    expect(await contract.getUserVote(0, alice.address)).to.equal(Sentiment.Bullish);
  });

  it("emits Voted on first vote", async () => {
    const { contract, alice } = await deploy();
    await expect(contract.connect(alice).vote(1, Sentiment.Bearish))
      .to.emit(contract, "Voted")
      .withArgs(alice.address, 1, Sentiment.Bearish);
  });

  it("rejects double voting (must use changeVote)", async () => {
    const { contract, alice } = await deploy();
    await contract.connect(alice).vote(0, Sentiment.Bullish);
    await expect(contract.connect(alice).vote(0, Sentiment.Bearish)).to.be.revertedWith(
      "Already voted",
    );
  });

  it("rejects invalid company id and None sentiment", async () => {
    const { contract, alice } = await deploy();
    await expect(contract.connect(alice).vote(3, Sentiment.Bullish)).to.be.revertedWith(
      "Invalid company",
    );
    await expect(contract.connect(alice).vote(0, Sentiment.None)).to.be.revertedWith(
      "Must be Bullish or Bearish",
    );
  });

  it("keeps per-company and per-wallet votes independent", async () => {
    const { contract, alice, bob } = await deploy();
    await contract.connect(alice).vote(0, Sentiment.Bullish);
    await contract.connect(bob).vote(0, Sentiment.Bearish);
    await contract.connect(alice).vote(1, Sentiment.Bearish);

    const [bull0, bear0, total0] = await contract.getResults(0);
    expect([bull0, bear0, total0]).to.deep.equal([1n, 1n, 2n]);

    const [bull1, bear1] = await contract.getResults(1);
    expect([bull1, bear1]).to.deep.equal([0n, 1n]);
  });

  it("blocks changeVote during cooldown, allows after", async () => {
    const { contract, alice } = await deploy();
    await contract.connect(alice).vote(0, Sentiment.Bullish);

    // Immediately trying to change -> blocked.
    await expect(
      contract.connect(alice).changeVote(0, Sentiment.Bearish),
    ).to.be.revertedWith("Cooldown active");

    // Fast-forward past the cooldown.
    await time.increase(COOLDOWN + 1);

    await expect(contract.connect(alice).changeVote(0, Sentiment.Bearish))
      .to.emit(contract, "VoteChanged")
      .withArgs(alice.address, 0, Sentiment.Bullish, Sentiment.Bearish);

    // Tally moved, total unchanged.
    const [bull, bear, total] = await contract.getResults(0);
    expect([bull, bear, total]).to.deep.equal([0n, 1n, 1n]);
  });

  it("rejects changeVote to the same sentiment and with no prior vote", async () => {
    const { contract, alice, bob } = await deploy();
    await contract.connect(alice).vote(0, Sentiment.Bullish);
    await time.increase(COOLDOWN + 1);

    await expect(
      contract.connect(alice).changeVote(0, Sentiment.Bullish),
    ).to.be.revertedWith("Same sentiment");

    await expect(
      contract.connect(bob).changeVote(0, Sentiment.Bearish),
    ).to.be.revertedWith("No vote to change");
  });

  it("reports cooldown remaining correctly", async () => {
    const { contract, alice } = await deploy();
    await contract.connect(alice).vote(0, Sentiment.Bullish);

    const remaining = await contract.changeCooldownRemaining(0, alice.address);
    expect(remaining).to.be.greaterThan(0n);

    await time.increase(COOLDOWN + 1);
    expect(await contract.changeCooldownRemaining(0, alice.address)).to.equal(0n);
  });
});
