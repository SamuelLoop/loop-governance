// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * LOOP Utility Token (Base L2)
 *
 * This is a UTILITY TOKEN granting access to governance, voting, delegation,
 * and community services within the Loop_cmbntr platform. It is NOT a security,
 * NOT an investment contract, and confers NO ownership, profit-sharing, or
 * equity rights in any entity.
 *
 * A future 1:1 swap to a regulated stablecoin-backed token will be offered
 * once legal structures and fund(s) are established. Holders will be able to
 * exchange each LOOP utility token for one unit of the replacement token at
 * no additional cost. Until that swap is live, LOOP functions solely as a
 * platform utility token.
 *
 * Tokenomics per purchase of N tokens:
 *   - N tokens minted to buyer's wallet (platform utility)
 *   - N/2 tokens minted to impact treasury (community funding)
 *   - N/2 tokens credited to buyer's allocation balance
 *     (directable to a community or exchangeable for advertising)
 *
 * Example: buy 2 LOOP = 2 to wallet + 1 to treasury + 1 allocation credit
 * Total supply increase per 2 purchased = 3 minted + 1 allocation credit
 */
contract LoopToken is ERC20, Ownable, Pausable {
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
    event AllocationDirected(
        address indexed from,
        bytes32 indexed communityId,
        uint256 amount
    );
    event AllocationExchangedForAd(
        address indexed from,
        uint256 amount
    );
    event CommunityWalletSet(bytes32 indexed communityId, address wallet);
    event PriceUpdated(uint256 newPrice);
    event TreasuryUpdated(address newTreasury);
    event SwapContractSet(address swapContract);
    event OwnershipTransferredToHardware(address indexed newOwner);

    constructor(
        address _impactTreasury,
        uint256 _pricePerToken
    ) ERC20("Loop Utility Token", "LOOP") Ownable(msg.sender) {
        impactTreasury = _impactTreasury;
        pricePerToken = _pricePerToken;
    }

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

    function directAllocation(bytes32 communityId, uint256 amount) external whenNotPaused {
        require(amount > 0, "Amount must be positive");
        require(allocationBalance[msg.sender] >= amount, "Insufficient allocation balance");
        address wallet = communityWallets[communityId];
        require(wallet != address(0), "Community wallet not registered");

        allocationBalance[msg.sender] -= amount;
        _mint(wallet, amount * 10 ** decimals());

        emit AllocationDirected(msg.sender, communityId, amount);
    }

    function exchangeForAdvertising(uint256 amount) external whenNotPaused {
        require(amount > 0, "Amount must be positive");
        require(allocationBalance[msg.sender] >= amount, "Insufficient allocation balance");

        allocationBalance[msg.sender] -= amount;

        emit AllocationExchangedForAd(msg.sender, amount);
    }

    // ── Admin functions (Ledger Flex owner only) ──

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

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    /**
     * Transfer ownership to Ledger hardware wallet.
     * This is a one-way operation for production security.
     */
    function transferToHardwareWallet(address ledgerAddress) external onlyOwner {
        require(ledgerAddress != address(0), "Zero address");
        transferOwnership(ledgerAddress);
        emit OwnershipTransferredToHardware(ledgerAddress);
    }
}
