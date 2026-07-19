const { ethers } = require("hardhat");

async function main() {
  const ledgerAddress = process.env.LEDGER_ADDRESS;
  if (!ledgerAddress) {
    console.error("Set LEDGER_ADDRESS in .env to your Ledger Flex ETH address");
    process.exit(1);
  }

  const contractAddress = process.env.LOOP_TOKEN_ADDRESS;
  if (!contractAddress) {
    console.error("Set LOOP_TOKEN_ADDRESS in .env to the deployed contract");
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  const token = await ethers.getContractAt("LoopToken", contractAddress);

  const currentOwner = await token.owner();
  console.log("Current owner:", currentOwner);
  console.log("Ledger address:", ledgerAddress);

  if (currentOwner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.error("Deployer is not the current owner");
    process.exit(1);
  }

  console.log("\nTransferring ownership to Ledger Flex...");
  const tx = await token.transferToHardwareWallet(ledgerAddress);
  await tx.wait();

  console.log("Ownership transferred.");
  console.log("New owner:", await token.owner());

  console.log("\nAlso updating impact treasury to Ledger...");
  // This will fail because ownership already transferred
  // The Ledger owner will need to call setImpactTreasury via Etherscan
  console.log("NOTE: Impact treasury update must be done from Ledger via Basescan.");
  console.log("Go to: https://basescan.org/address/" + contractAddress + "#writeContract");
  console.log("Connect Ledger via MetaMask, call setImpactTreasury(" + ledgerAddress + ")");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
