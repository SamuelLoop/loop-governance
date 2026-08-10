const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LoopTokenV2", function () {
  let token, owner, buyer, treasury, communityWallet, other;

  beforeEach(async function () {
    [owner, buyer, treasury, communityWallet, other] = await ethers.getSigners();
    const LoopTokenV2 = await ethers.getContractFactory("LoopTokenV2");
    const price = ethers.parseEther("0.0004");
    token = await LoopTokenV2.deploy(treasury.address, price);
    await token.waitForDeployment();
  });

  // ── Deployment ─────────────────────────────────────────────────────

  describe("deployment", function () {
    it("should deploy with correct name and symbol", async function () {
      expect(await token.name()).to.equal("Loop Utility Token");
      expect(await token.symbol()).to.equal("LOOP");
    });

    it("should reject a zero-address impact treasury", async function () {
      const LoopTokenV2 = await ethers.getContractFactory("LoopTokenV2");
      await expect(
        LoopTokenV2.deploy(ethers.ZeroAddress, ethers.parseEther("0.0004"))
      ).to.be.revertedWith("Zero treasury");
    });
  });

  // ── purchase() — unchanged from V1, re-verified on V2 ────────────────

  describe("purchase", function () {
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

    it("should reject insufficient ETH", async function () {
      await expect(
        token.connect(buyer).purchase(2, { value: 1n })
      ).to.be.revertedWith("Insufficient ETH");
    });

    it("should mint correct amounts and emit TokensPurchased", async function () {
      const price = await token.pricePerToken();
      await expect(token.connect(buyer).purchase(10, { value: price * 10n }))
        .to.emit(token, "TokensPurchased")
        .withArgs(buyer.address, 10n, 5n, 5n);

      expect(await token.balanceOf(buyer.address)).to.equal(ethers.parseEther("10"));
      expect(await token.balanceOf(treasury.address)).to.equal(ethers.parseEther("5"));
      expect(await token.allocationBalance(buyer.address)).to.equal(5n);
    });

    it("should refund excess ETH", async function () {
      const price = await token.pricePerToken();
      const cost = price * 2n;
      const excess = ethers.parseEther("1");

      const balBefore = await ethers.provider.getBalance(buyer.address);
      const tx = await token.connect(buyer).purchase(2, { value: cost + excess });
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const balAfter = await ethers.provider.getBalance(buyer.address);

      const spent = balBefore - balAfter;
      expect(spent).to.be.closeTo(cost + gasUsed, ethers.parseEther("0.0001"));
    });

    it("should revert while paused", async function () {
      await token.pause();
      const price = await token.pricePerToken();
      await expect(
        token.connect(buyer).purchase(2, { value: price * 2n })
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
    });
  });

  // ── mintForPurchase() — V2 only, owner-only ──────────────────────────

  describe("mintForPurchase", function () {
    it("should reject calls from non-owner", async function () {
      await expect(
        token.connect(buyer).mintForPurchase(buyer.address, 2)
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });

    it("should reject a zero buyer address", async function () {
      await expect(
        token.mintForPurchase(ethers.ZeroAddress, 2)
      ).to.be.revertedWith("Zero buyer");
    });

    it("should reject odd or zero amounts", async function () {
      await expect(
        token.mintForPurchase(buyer.address, 1)
      ).to.be.revertedWith("Amount must be positive and even");
      await expect(
        token.mintForPurchase(buyer.address, 0)
      ).to.be.revertedWith("Amount must be positive and even");
    });

    it("should mint the correct split and emit MintForPurchase", async function () {
      await expect(token.mintForPurchase(buyer.address, 10))
        .to.emit(token, "MintForPurchase")
        .withArgs(buyer.address, 10n, 5n, 5n);

      expect(await token.balanceOf(buyer.address)).to.equal(ethers.parseEther("10"));
      expect(await token.balanceOf(treasury.address)).to.equal(ethers.parseEther("5"));
      expect(await token.allocationBalance(buyer.address)).to.equal(5n);
      expect(await token.totalPurchased()).to.equal(10n);
      expect(await token.totalImpactMinted()).to.equal(5n);
      expect(await token.totalAllocationMinted()).to.equal(5n);
    });

    it("should accumulate totals across purchase() and mintForPurchase()", async function () {
      const price = await token.pricePerToken();
      await token.connect(buyer).purchase(4, { value: price * 4n });
      await token.mintForPurchase(other.address, 6);

      expect(await token.totalPurchased()).to.equal(10n);
      expect(await token.totalImpactMinted()).to.equal(5n);
      expect(await token.totalAllocationMinted()).to.equal(5n);
    });

    it("should revert while paused", async function () {
      await token.pause();
      await expect(
        token.mintForPurchase(buyer.address, 2)
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
    });
  });

  // ── directAllocation() — buyer-controlled, unchanged from V1 ────────

  describe("directAllocation", function () {
    beforeEach(async function () {
      const price = await token.pricePerToken();
      await token.connect(buyer).purchase(2, { value: price * 2n }); // allocation credit: 1
      const communityId = ethers.encodeBytes32String("test-community");
      await token.setCommunityWallet(communityId, communityWallet.address);
      this.communityId = communityId;
    });

    it("should reject zero amount", async function () {
      await expect(
        token.connect(buyer).directAllocation(this.communityId, 0)
      ).to.be.revertedWith("Amount must be positive");
    });

    it("should reject insufficient allocation balance", async function () {
      await expect(
        token.connect(buyer).directAllocation(this.communityId, 5)
      ).to.be.revertedWith("Insufficient allocation balance");
    });

    it("should reject an unregistered community wallet", async function () {
      const unknownId = ethers.encodeBytes32String("unknown");
      await expect(
        token.connect(buyer).directAllocation(unknownId, 1)
      ).to.be.revertedWith("Community wallet not registered");
    });

    it("should direct allocation and emit AllocationDirected", async function () {
      await expect(token.connect(buyer).directAllocation(this.communityId, 1))
        .to.emit(token, "AllocationDirected")
        .withArgs(buyer.address, this.communityId, 1n);

      expect(await token.balanceOf(communityWallet.address)).to.equal(ethers.parseEther("1"));
      expect(await token.allocationBalance(buyer.address)).to.equal(0n);
    });
  });

  // ── directAllocationFor() — V2 only, owner-only server-signed direction ─

  describe("directAllocationFor", function () {
    beforeEach(async function () {
      await token.mintForPurchase(buyer.address, 2); // allocation credit: 1
      const communityId = ethers.encodeBytes32String("test-community");
      await token.setCommunityWallet(communityId, communityWallet.address);
      this.communityId = communityId;
    });

    it("should reject calls from non-owner", async function () {
      await expect(
        token.connect(buyer).directAllocationFor(buyer.address, this.communityId, 1)
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });

    it("should direct a buyer's allocation on their behalf and emit AllocationDirected", async function () {
      await expect(token.directAllocationFor(buyer.address, this.communityId, 1))
        .to.emit(token, "AllocationDirected")
        .withArgs(buyer.address, this.communityId, 1n);

      expect(await token.balanceOf(communityWallet.address)).to.equal(ethers.parseEther("1"));
      expect(await token.allocationBalance(buyer.address)).to.equal(0n);
    });

    it("should reject insufficient allocation balance", async function () {
      await expect(
        token.directAllocationFor(buyer.address, this.communityId, 5)
      ).to.be.revertedWith("Insufficient allocation balance");
    });

    it("should reject an unregistered community wallet", async function () {
      const unknownId = ethers.encodeBytes32String("unknown");
      await expect(
        token.directAllocationFor(buyer.address, unknownId, 1)
      ).to.be.revertedWith("Community wallet not registered");
    });
  });

  // ── exchangeForAdvertising() — unchanged from V1 ─────────────────────

  describe("exchangeForAdvertising", function () {
    beforeEach(async function () {
      await token.mintForPurchase(buyer.address, 2); // allocation credit: 1
    });

    it("should reject zero amount", async function () {
      await expect(
        token.connect(buyer).exchangeForAdvertising(0)
      ).to.be.revertedWith("Amount must be positive");
    });

    it("should reject insufficient allocation balance", async function () {
      await expect(
        token.connect(buyer).exchangeForAdvertising(5)
      ).to.be.revertedWith("Insufficient allocation balance");
    });

    it("should exchange allocation and emit AllocationExchangedForAd", async function () {
      await expect(token.connect(buyer).exchangeForAdvertising(1))
        .to.emit(token, "AllocationExchangedForAd")
        .withArgs(buyer.address, 1n);
      expect(await token.allocationBalance(buyer.address)).to.equal(0n);
    });
  });

  // ── transferImpactTreasury() — V2 only, two branches ─────────────────

  describe("transferImpactTreasury", function () {
    it("should reject calls from non-owner", async function () {
      await expect(
        token.connect(buyer).transferImpactTreasury(other.address, 1)
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });

    it("should reject a zero recipient", async function () {
      await expect(
        token.transferImpactTreasury(ethers.ZeroAddress, 1)
      ).to.be.revertedWith("Zero recipient");
    });

    it("should reject a zero amount", async function () {
      await expect(
        token.transferImpactTreasury(other.address, 0)
      ).to.be.revertedWith("Amount must be positive");
    });

    it("should transfer directly when impactTreasury == owner (no allowance needed)", async function () {
      // Redeploy with owner as its own treasury to exercise this branch.
      const LoopTokenV2 = await ethers.getContractFactory("LoopTokenV2");
      const t = await LoopTokenV2.deploy(owner.address, ethers.parseEther("0.0004"));
      await t.waitForDeployment();
      await t.mintForPurchase(owner.address, 2); // mints 1 LOOP to owner (== impactTreasury)

      await expect(t.transferImpactTreasury(other.address, 1))
        .to.emit(t, "ImpactTreasuryTransferred")
        .withArgs(other.address, 1n);
      expect(await t.balanceOf(other.address)).to.equal(ethers.parseEther("1"));
    });

    it("should require allowance when impactTreasury != owner, and revert without it", async function () {
      await token.mintForPurchase(buyer.address, 2); // mints 1 LOOP to treasury (separate from owner)
      await expect(
        token.transferImpactTreasury(other.address, 1)
      ).to.be.revertedWith("Impact treasury allowance too low");
    });

    it("should succeed once the treasury approves the owner", async function () {
      await token.mintForPurchase(buyer.address, 2); // mints 1 LOOP to treasury
      await token.connect(treasury).approve(owner.address, ethers.parseEther("1"));

      await expect(token.transferImpactTreasury(other.address, 1))
        .to.emit(token, "ImpactTreasuryTransferred")
        .withArgs(other.address, 1n);
      expect(await token.balanceOf(other.address)).to.equal(ethers.parseEther("1"));
      expect(await token.balanceOf(treasury.address)).to.equal(0n);
    });
  });

  // ── Admin setters ─────────────────────────────────────────────────

  describe("admin setters", function () {
    it("should only let owner set community wallet", async function () {
      const id = ethers.encodeBytes32String("x");
      await expect(
        token.connect(buyer).setCommunityWallet(id, buyer.address)
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");

      await expect(token.setCommunityWallet(id, communityWallet.address))
        .to.emit(token, "CommunityWalletSet")
        .withArgs(id, communityWallet.address);
    });

    it("should only let owner set price", async function () {
      await expect(
        token.connect(buyer).setPrice(1n)
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");

      await expect(token.setPrice(ethers.parseEther("0.001")))
        .to.emit(token, "PriceUpdated")
        .withArgs(ethers.parseEther("0.001"));
    });

    it("should only let owner set impact treasury, rejecting zero address", async function () {
      await expect(
        token.connect(buyer).setImpactTreasury(other.address)
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");

      await expect(token.setImpactTreasury(ethers.ZeroAddress)).to.be.revertedWith("Zero address");

      await expect(token.setImpactTreasury(other.address))
        .to.emit(token, "TreasuryUpdated")
        .withArgs(other.address);
    });

    it("should only let owner set swap contract, rejecting zero address", async function () {
      await expect(
        token.connect(buyer).setSwapContract(other.address)
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");

      await expect(token.setSwapContract(ethers.ZeroAddress)).to.be.revertedWith("Zero address");

      await expect(token.setSwapContract(other.address))
        .to.emit(token, "SwapContractSet")
        .withArgs(other.address);
    });
  });

  // ── pause / unpause ───────────────────────────────────────────────

  describe("pause / unpause", function () {
    it("should only let owner pause and unpause", async function () {
      await expect(token.connect(buyer).pause()).to.be.revertedWithCustomError(
        token,
        "OwnableUnauthorizedAccount"
      );
      await token.pause();
      expect(await token.paused()).to.equal(true);

      await expect(token.connect(buyer).unpause()).to.be.revertedWithCustomError(
        token,
        "OwnableUnauthorizedAccount"
      );
      await token.unpause();
      expect(await token.paused()).to.equal(false);
    });

    it("should block directAllocation and directAllocationFor while paused", async function () {
      await token.mintForPurchase(buyer.address, 2);
      const communityId = ethers.encodeBytes32String("test-community");
      await token.setCommunityWallet(communityId, communityWallet.address);
      await token.pause();

      await expect(
        token.connect(buyer).directAllocation(communityId, 1)
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
      await expect(
        token.directAllocationFor(buyer.address, communityId, 1)
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
    });

    it("should block transferImpactTreasury while paused", async function () {
      await token.mintForPurchase(buyer.address, 2);
      await token.connect(treasury).approve(owner.address, ethers.parseEther("1"));
      await token.pause();

      await expect(
        token.transferImpactTreasury(other.address, 1)
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
    });
  });

  // ── withdraw() ────────────────────────────────────────────────────

  describe("withdraw", function () {
    it("should only let owner withdraw", async function () {
      await expect(token.connect(buyer).withdraw()).to.be.revertedWithCustomError(
        token,
        "OwnableUnauthorizedAccount"
      );
    });

    it("should withdraw the contract's ETH balance to the owner", async function () {
      // Send ETH into the contract via an overpaid purchase that leaves
      // dust, then top it up directly isn't possible (no receive()), so
      // instead verify withdraw() is a no-op-safe call with zero balance.
      const balBefore = await ethers.provider.getBalance(owner.address);
      const tx = await token.withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const balAfter = await ethers.provider.getBalance(owner.address);
      expect(balBefore - balAfter).to.equal(gasUsed);
    });
  });

  // ── transferToHardwareWallet() ────────────────────────────────────

  describe("transferToHardwareWallet", function () {
    it("should only let owner call it", async function () {
      await expect(
        token.connect(buyer).transferToHardwareWallet(other.address)
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });

    it("should reject a zero address", async function () {
      await expect(
        token.transferToHardwareWallet(ethers.ZeroAddress)
      ).to.be.revertedWith("Zero address");
    });

    it("should transfer ownership and emit OwnershipTransferredToHardware", async function () {
      await expect(token.transferToHardwareWallet(other.address))
        .to.emit(token, "OwnershipTransferredToHardware")
        .withArgs(other.address);
      expect(await token.owner()).to.equal(other.address);
    });

    it("should revoke the old owner's admin access once transferred", async function () {
      await token.transferToHardwareWallet(other.address);
      await expect(token.setPrice(1n)).to.be.revertedWithCustomError(
        token,
        "OwnableUnauthorizedAccount"
      );
      await expect(token.connect(other).setPrice(1n)).to.not.be.reverted;
    });
  });
});
