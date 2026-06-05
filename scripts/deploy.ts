// ============================================================
// Deploy script. Deploys SentimentVoting to whichever --network
// you pass (baseSepolia or base) and prints the address + the
// exact `verify` command to run next.
//
//   npm run deploy:sepolia      (testnet, do this first)
//   npm run deploy:mainnet      (only after testnet works)
// ============================================================

import { ethers, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  if (!deployer) {
    throw new Error(
      "No deployer account. Set DEPLOYER_PRIVATE_KEY in .env and fund it with test ETH.",
    );
  }

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Network:  ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${ethers.formatEther(balance)} ETH\n`);

  // Deploy. The contract has no constructor args.
  console.log("Deploying SentimentVoting…");
  const factory = await ethers.getContractFactory("SentimentVoting");
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`\n✅ Deployed to: ${address}\n`);

  // Print the next steps so you can copy-paste.
  console.log("Next steps:");
  console.log(`  1) Put this in frontend/.env:`);
  console.log(`       VITE_CONTRACT_ADDRESS=${address}`);
  console.log(
    `       VITE_CHAIN=${network.name === "base" ? "base" : "base-sepolia"}`,
  );
  console.log(`  2) Verify on Basescan:`);
  console.log(`       npx hardhat verify --network ${network.name} ${address}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
