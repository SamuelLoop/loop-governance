// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * LOOP Utility Token (Base L2) — V2
 *
 * Same tokenomics as V1 (N buyer + N/2 impact treasury + N/2 allocation),
 * with three additions that make cash-paid purchases and platform-managed
 * expiries actually work:
 *
 *   1. mintForPurchase(buyer, amount) — owner-only. Mirrors the on-chain
 *      purchase() flow but skips the ETH payment; used by the Loop_cmbntr
 *      backend to mint tokens for buyers who paid via Stripe/card and
 *      have connected their wallet on /claim. Enables:
 *
 *      Buy $10 with card -> backend records purchase -> buyer connects
 *      wallet on /claim -> backend calls mintForPurchase(wallet, 10)
 *      -> 10 to wallet + 5 to impact treasury + 5 credit to allocation.
 *
 *   2. directAllocationFor(buyer, communityId, amount) — owner-only.
 *      Server-side direction of a buyer's allocation, used when the
 *      buyer picks a community in the console. Also used by the expiry
 *      sweep to move stale allocations back to the impact treasury.
 *
 *   3. transferImpactTreasury(to, amount) — owner-only. Lets the super
 *      admin move impact treasury tokens to a community wallet or an
 *      external grant recipient without having to hold the treasury
 *      address's private key.
 *
 * All V1 functions (purchase, directAllocation, exchangeForAdvertising,
 * setCommunityWallet, admin controls) are preserved unchanged so a
 * connected wallet can still act directly.
 */
contract LoopTokenV2 is ERC20, Ownable, Pausable {
    address public impactTreasury;
    uint256 public pricePerToken;
    uint256 public totalPurchased;
    uint256 public totalImpactMinted;
    uint256 public totalAllocationMinted;

    // Future swap contract address (set when stablecoin migration is ready)
    address public swapContract;

    mapping(address => uint256) public allocationBalance;
    mapping(bytes32 => address) public communityWallets;

    event TokensPurchased(
        address indexed buyer,
        uint256 purchased,
        uint256 impactMinted,
        uint256 allocationMinted
    );
    event MintForPurchase(
        address indexed buyer,
        uint256 amount,
        uint256 impactMinted,
        uint256 allocationMinted
    );
    event AllocationDirected(
        address indexed from,
        bytes32 indexed communityId,
        uint256 amount
    );
    event AllocationExchangedForAd(address indexed from, uint256 amount);
    event CommunityWalletSet(bytes32 indexed communityId, address wallet);
    event ImpactTreasuryTransferred(address indexed to, uint256 amount);
    event PriceUpdated(uint256 newPrice);
    event TreasuryUpdated(address newTreasury);
    event SwapContractSet(address swapContract);
    event OwnershipTransferredToHardware(address indexed newOwner);

    constructor(address _impactTreasury, uint256 _pricePerToken)
        ERC20("Loop Utility Token", "LOOP")
        Ownable(msg.sender)
    {
        require(_impactTreasury != address(0), "Zero treasury");
        impactTreasury = _impactTreasury;
        pricePerToken = _pricePerToken;
    }

    // ── V1 on-chain purchase (unchanged) ───────────────────────────────

    function purchase(uint256 amount) external payable whenNotPaused {
        require(amount > 0 && amount % 2 == 0, "Amount must be positive and even");
        require(msg.value >= amount * pricePerToken, "Insufficient ETH");

        uint256 impactAmount = amount / 2;
        uint256 allocationAmount = amount / 2;

        _mint(msg.sender, amount * 10 ** decimals());
        _mint(impactTreasury, impactAmount * 10 ** decimals());

        allocationBalance[msg.sender] += allocationAmount;

        totalPurchased += amount;
        totalImpactMinted += impactAmount;
        totalAllocationMinted += allocationAmount;

        uint256 cost = amount * pricePerToken;
        if (msg.value > cost) {
            payable(msg.sender).transfer(msg.value - cost);
        }

        emit TokensPurchased(msg.sender, amount, impactAmount, allocationAmount);
    }

    // ── V2: platform-managed cash-purchase mint ────────────────────────

    /**
     * Owner-only. Mirrors purchase() without the ETH payment: used by the
     * Loop_cmbntr backend to mint LOOP for buyers who paid off-chain and
     * have provided a wallet address on /claim.
     */
    function mintForPurchase(address buyer, uint256 amount) external onlyOwner whenNotPaused {
        require(buyer != address(0), "Zero buyer");
        require(amount > 0 && amount % 2 == 0, "Amount must be positive and even");

        uint256 impactAmount = amount / 2;
        uint256 allocationAmount = amount / 2;

        _mint(buyer, amount * 10 ** decimals());
        _mint(impactTreasury, impactAmount * 10 ** decimals());

        allocationBalance[buyer] += allocationAmount;

        totalPurchased += amount;
        totalImpactMinted += impactAmount;
        totalAllocationMinted += allocationAmount;

        emit MintForPurchase(buyer, amount, impactAmount, allocationAmount);
    }

    // ── V1 buyer-controlled allocation direction ───────────────────────

    function directAllocation(bytes32 communityId, uint256 amount) external whenNotPaused {
        _direct(msg.sender, communityId, amount);
    }

    function exchangeForAdvertising(uint256 amount) external whenNotPaused {
        require(amount > 0, "Amount must be positive");
        require(allocationBalance[msg.sender] >= amount, "Insufficient allocation balance");
        allocationBalance[msg.sender] -= amount;
        emit AllocationExchangedForAd(msg.sender, amount);
    }

    // ── V2: server-signed direction ─────────────────────────────────────

    /**
     * Owner-only. Direct a specific buyer's allocation to a community
     * (or, for the expiry sweep, to the impact-treasury community).
     * Used when the buyer picks a destination in the console UI without
     * connecting a wallet, and when a stale slice sweeps.
     */
    function directAllocationFor(
        address buyer,
        bytes32 communityId,
        uint256 amount
    ) external onlyOwner whenNotPaused {
        _direct(buyer, communityId, amount);
    }

    function _direct(address buyer, bytes32 communityId, uint256 amount) internal {
        require(amount > 0, "Amount must be positive");
        require(allocationBalance[buyer] >= amount, "Insufficient allocation balance");
        address wallet = communityWallets[communityId];
        require(wallet != address(0), "Community wallet not registered");

        allocationBalance[buyer] -= amount;
        _mint(wallet, amount * 10 ** decimals());

        emit AllocationDirected(buyer, communityId, amount);
    }

    // ── V2: super-admin impact treasury movements ──────────────────────

    /**
     * Owner-only. Transfer LOOP already sitting in the impact treasury
     * to a specific recipient (community wallet, grantee, etc). Lets the
     * super admin move impact treasury tokens without holding the
     * treasury address's private key directly.
     *
     * Requires the impactTreasury address to have first approved the
     * owner for this amount. In practice the treasury == owner in the
     * simplest deployment, in which case this reduces to a transfer.
     */
    function transferImpactTreasury(address to, uint256 amount) external onlyOwner whenNotPaused {
        require(to != address(0), "Zero recipient");
        require(amount > 0, "Amount must be positive");
        uint256 unit = amount * 10 ** decimals();
        if (impactTreasury == owner()) {
            _transfer(impactTreasury, to, unit);
        } else {
            uint256 allowed = allowance(impactTreasury, owner());
            require(allowed >= unit, "Impact treasury allowance too low");
            _spendAllowance(impactTreasury, owner(), unit);
            _transfer(impactTreasury, to, unit);
        }
        emit ImpactTreasuryTransferred(to, amount);
    }

    // ── Admin ──────────────────────────────────────────────────────────

    function setCommunityWallet(bytes32 communityId, address wallet) external onlyOwner {
        communityWallets[communityId] = wallet;
        emit CommunityWalletSet(communityId, wallet);
    }

    function setPrice(uint256 newPrice) external onlyOwner {
        pricePerToken = newPrice;
        emit PriceUpdated(newPrice);
    }

    function setImpactTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Zero address");
        impactTreasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    function setSwapContract(address _swapContract) external onlyOwner {
        swapContract = _swapContract;
        emit SwapContractSet(_swapContract);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function transferToHardwareWallet(address ledgerAddress) external onlyOwner {
        require(ledgerAddress != address(0), "Zero address");
        transferOwnership(ledgerAddress);
        emit OwnershipTransferredToHardware(ledgerAddress);
    }
}
