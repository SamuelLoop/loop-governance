const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    console.error("\nNo ETH balance. Fund the deployer wallet first.");
    process.exit(1);
  }

  // Impact treasury starts as deployer, will be updated to Ledger address
  const impactTreasury =
    process.env.IMPACT_TREASURY_ADDRESS ?? deployer.address;

  // Price: 0.0004 ETH per LOOP (~$1 at ~$2500/ETH)
  const pricePerToken = ethers.parseEther("0.0004");

  console.log("\nDeploying LoopToken...");
  console.log("  Impact treasury:", impactTreasury);
  console.log("  Price per token:", ethers.formatEther(pricePerToken), "ETH");

  const LoopToken = await ethers.getContractFactory("LoopToken");
  const token = await LoopToken.deploy(impactTreasury, pricePerToken);
  await token.waitForDeployment();

  const address = await token.getAddress();
  const network = await ethers.provider.getNetwork();

  console.log("\n========================================");
  console.log("  LOOP UTILITY TOKEN DEPLOYED");
  console.log("========================================");
  console.log("  Contract:", address);
  console.log("  Network:", network.name);
  console.log("  Chain ID:", network.chainId.toString());
  console.log("  Owner:", deployer.address);
  console.log("  Treasury:", impactTreasury);
  console.log("========================================");

  console.log("\nIMPORTANT NEXT STEPS:");
  console.log("");
  console.log("1. SET ENV VAR in apps/portal/.env.local:");
  console.log("   NEXT_PUBLIC_LOOP_TOKEN_ADDRESS=" + address);
  console.log("   NEXT_PUBLIC_LOOP_CHAIN_ID=" + network.chainId.toString());
  console.log("");
  console.log("2. TRANSFER OWNERSHIP TO LEDGER FLEX:");
  console.log("   Run: npx hardhat run scripts/transfer-to-ledger.js --network " + network.name);
  console.log("   (set LEDGER_ADDRESS in .env first)");
  console.log("");
  console.log("3. VERIFY ON BASESCAN:");
  console.log(
    "   npx hardhat verify --network " + network.name,
    address,
    impactTreasury,
    pricePerToken.toString()
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
