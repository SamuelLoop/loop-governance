const { ethers } = require("hardhat");

async function main() {
  const address = "0xb2BC710034e7bf3B5e07135856bce15c454E1d7E";
  const balance = await ethers.provider.getBalance(address);
  console.log("Address:", address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
}

main().catch(console.error);
