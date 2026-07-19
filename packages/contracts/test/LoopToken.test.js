const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LoopToken", function () {
  let token, owner, buyer, treasury;

  beforeEach(async function () {
    [owner, buyer, treasury] = await ethers.getSigners();
    const LoopToken = await ethers.getContractFactory("LoopToken");
    const price = ethers.parseEther("0.0004");
    token = await LoopToken.deploy(treasury.address, price);
    await token.waitForDeployment();
  });

  it("should deploy with correct name and symbol", async function () {
    expect(await token.name()).to.equal("Loop Utility Token");
    expect(await token.symbol()).to.equal("LOOP");
  });

  it("should reject odd purchase amounts", async function () {
    const cost = ethers.parseEther("0.0004");
    await expect(
      token.connect(buyer).purchase(1, { value: cost })
    ).to.be.revertedWith("Amount must be positive and even");
  });

  it("should reject zero purchase", async function () {
    await expect(
      token.connect(buyer).purchase(0, { value: 0 })
    ).to.be.revertedWith("Amount must be positive and even");
  });

  it("should mint correct amounts on purchase of 2", async function () {
    const price = await token.pricePerToken();
    const cost = price * 2n;

    await token.connect(buyer).purchase(2, { value: cost });

    // Buyer gets 2 LOOP
    const buyerBal = await token.balanceOf(buyer.address);
    expect(buyerBal).to.equal(ethers.parseEther("2"));

    // Treasury gets 1 LOOP (impact)
    const treasuryBal = await token.balanceOf(treasury.address);
    expect(treasuryBal).to.equal(ethers.parseEther("1"));

    // Buyer has 1 allocation credit
    const alloc = await token.allocationBalance(buyer.address);
    expect(alloc).to.equal(1n);
  });

  it("should mint correct amounts on purchase of 10", async function () {
    const price = await token.pricePerToken();
    const cost = price * 10n;

    await token.connect(buyer).purchase(10, { value: cost });

    // Buyer gets 10
    expect(await token.balanceOf(buyer.address)).to.equal(
      ethers.parseEther("10")
    );
    // Treasury gets 5
    expect(await token.balanceOf(treasury.address)).to.equal(
      ethers.parseEther("5")
    );
    // Allocation: 5
    expect(await token.allocationBalance(buyer.address)).to.equal(5n);
  });

  it("should reject insufficient ETH", async function () {
    await expect(
      token.connect(buyer).purchase(2, { value: 1n })
    ).to.be.revertedWith("Insufficient ETH");
  });

  it("should refund excess ETH", async function () {
    const price = await token.pricePerToken();
    const cost = price * 2n;
    const excess = ethers.parseEther("1");

    const balBefore = await ethers.provider.getBalance(buyer.address);
    const tx = await token
      .connect(buyer)
      .purchase(2, { value: cost + excess });
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed * receipt.gasPrice;
    const balAfter = await ethers.provider.getBalance(buyer.address);

    // Should have paid only cost + gas, not cost + excess + gas
    const spent = balBefore - balAfter;
    expect(spent).to.be.closeTo(cost + gasUsed, ethers.parseEther("0.0001"));
  });

  it("should allow directing allocation to a community", async function () {
    const price = await token.pricePerToken();
    await token.connect(buyer).purchase(2, { value: price * 2n });

    // Register a community wallet
    const communityId = ethers.encodeBytes32String("test-community");
    const [, , , communityWallet] = await ethers.getSigners();
    await token.setCommunityWallet(communityId, communityWallet.address);

    // Direct 1 allocation
    await token.connect(buyer).directAllocation(communityId, 1);

    // Community wallet gets 1 LOOP minted
    expect(await token.balanceOf(communityWallet.address)).to.equal(
      ethers.parseEther("1")
    );

    // Allocation balance is now 0
    expect(await token.allocationBalance(buyer.address)).to.equal(0n);
  });

  it("should allow exchanging allocation for advertising", async function () {
    const price = await token.pricePerToken();
    await token.connect(buyer).purchase(2, { value: price * 2n });

    expect(await token.allocationBalance(buyer.address)).to.equal(1n);

    await token.connect(buyer).exchangeForAdvertising(1);

    expect(await token.allocationBalance(buyer.address)).to.equal(0n);
  });

  it("should track totals correctly", async function () {
    const price = await token.pricePerToken();
    await token.connect(buyer).purchase(4, { value: price * 4n });

    expect(await token.totalPurchased()).to.equal(4n);
    expect(await token.totalImpactMinted()).to.equal(2n);
    expect(await token.totalAllocationMinted()).to.equal(2n);
  });

  it("should only let owner set price", async function () {
    await expect(
      token.connect(buyer).setPrice(1n)
    ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
  });

  it("should only let owner set community wallet", async function () {
    const id = ethers.encodeBytes32String("x");
    await expect(
      token.connect(buyer).setCommunityWallet(id, buyer.address)
    ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
  });
});
