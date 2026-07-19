const { ethers } = require("hardhat");

async function main() {
  const token = await ethers.getContractAt("LoopToken", process.env.LOOP_TOKEN_ADDRESS);
  console.log("Contract:", process.env.LOOP_TOKEN_ADDRESS);
  console.log("Owner:", await token.owner());
  console.log("Impact Treasury:", await token.impactTreasury());
  console.log("Price per token:", ethers.formatEther(await token.pricePerToken()), "ETH");
}

main().catch(console.error);
