// Deploy LoopTokenV2 to Base L2.
// Requires:
//   PRIVATE_KEY   - deployer/owner private key (Base L2 EOA with ~$1 of ETH)
//   BASE_RPC_URL  - Base L2 RPC endpoint (default https://mainnet.base.org)
//
// Usage:
//   cd packages/contracts
//   npx hardhat run scripts/deploy-v2.js --network base

const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying LoopTokenV2 from:", deployer.address);
  const bal = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(bal), "ETH");

  // Impact treasury = deployer for now; can be changed later via setImpactTreasury.
  const impactTreasury = deployer.address;
  // Price per token in wei. Set to zero because cash purchases mint directly;
  // if someone wants to buy via on-chain purchase() they need to send ETH matching.
  const pricePerToken = 0n;

  const factory = await hre.ethers.getContractFactory("LoopTokenV2");
  const token = await factory.deploy(impactTreasury, pricePerToken);
  await token.waitForDeployment();

  const addr = await token.getAddress();
  console.log("─────────────────────────────────────────");
  console.log("LoopTokenV2 deployed:", addr);
  console.log("Impact treasury:      ", impactTreasury);
  console.log("Owner:                ", deployer.address);
  console.log("─────────────────────────────────────────");
  console.log("Update these Vercel env vars on portal, console, and admin:");
  console.log("  NEXT_PUBLIC_LOOP_TOKEN_ADDRESS =", addr);
  console.log("  NEXT_PUBLIC_LOOP_CHAIN_ID      =", 8453);
  console.log("Then set on the console + portal projects only:");
  console.log("  LOOP_OWNER_PRIVATE_KEY = <same key you deployed with>");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
