# LOOP Token Fact Sheet

**Prepared for liquidity providers and bridge partners**
**Date: 20 July 2026**

---

## Contract Details

| Field | Value |
|---|---|
| Token name | Loop Utility Token |
| Symbol | LOOP |
| Standard | ERC-20 |
| Decimals | 18 |
| Chain | Base L2 (Coinbase), Chain ID 8453 |
| Contract address | `0xb8B309BBD007143cbef1844b75C1Fd038a267F21` |
| Basescan | basescan.org/token/0xb8B309BBD007143cbef1844b75C1Fd038a267F21 |
| Owner address | `0xDB113f65d3368e5C0379486755fc3Fc0b7fB97cE` |
| Compiler | Solidity v0.8.24 |
| Optimization | Enabled, 200 runs |
| EVM version | Paris |
| Source verified | Yes, on Basescan (Standard Json-Input format) |
| Contract name | LoopToken |
| Built on | OpenZeppelin (Ownable, ERC20, Pausable) |
| Bytecode size | 5,785 bytes (direct deployment, not a proxy) |
| Audit | Built on audited OpenZeppelin contracts. Standalone audit pending. |

---

## Supply Model

| Field | Value |
|---|---|
| Initial target supply | 1,000,000,000 (1B) LOOP |
| Current total supply | 0 (mint-on-purchase model) |
| Supply type | Inflationary, mint-on-demand |
| Hard cap | None |

Tokens are minted when purchased. There is no pre-minted supply. Additional supply growth comes from two sources:

1. **Business enrolment**: businesses joining the Loop governance platform trigger new token minting, adding both tokens and liquidity to the ecosystem.

2. **Fund structure**: assets held within the Loop fund structure back further token issuance, creating an asset-linked expansion model rather than uncapped inflation.

---

## Pricing

| Method | Price |
|---|---|
| On-chain (ETH) | 0.0004 ETH per token (set in contract) |
| Card (USD) | $1.00 per token |
| Card (GBP) | 0.80 per token |
| Card (EUR) | 0.90 per token |

---

## Tokenomics

For every token purchased, the contract mints a total of 2x tokens:

| Allocation | Amount | Purpose |
|---|---|---|
| Buyer | 1.0x | Sent to the purchaser's wallet |
| Impact Treasury | 0.5x | Funds community governance projects |
| Allocation Pot | 0.5x | Distributed as governance participation rewards |
| **Total minted** | **2.0x** | |

This means a purchase of 100 LOOP results in 200 LOOP being minted: 100 to the buyer, 50 to the Impact Treasury, and 50 to the Allocation Pot.

---

## Contract Functions

The contract exposes the following key functions:

**Public:**

- `purchase(uint256 amount)` payable: buy tokens with ETH. Requires `amount * pricePerToken` as `msg.value`.
- `pricePerToken()` view: returns the current price per token in wei (400000000000000 = 0.0004 ETH).

**Owner only:**

- `mint(address to, uint256 amount)`: mint tokens to a specified address (used for card purchase fulfilment from Ledger wallet).
- `pause()` / `unpause()`: emergency pause mechanism.
- `transferOwnership(address)`: transfer contract ownership.

**Events:**

- `AllocationDirected(address from, bytes32 communityId, uint256 amount)`: emitted when tokens are directed to a community.
- `AllocationExchangedForAd(address from, uint256 amount)`: emitted when allocation tokens are exchanged.
- `CommunityWalletSet(bytes32 communityId, address wallet)`: emitted when a community wallet is configured.

---

## Platform

| Field | Value |
|---|---|
| Platform | Loop_cmbntr |
| Website | gov.loopcmbntr.live |
| Console | console.loopcmbntr.live |
| Entity | Loop TGP |
| Purpose | Utility token for global governance platform |
| Use cases | Voting weight, delegation, community participation, earnings distribution |
| Classification | Utility token. Not a security. |

---

## Liquidity Requirements

We are seeking a liquidity bridge partner to provide trading liquidity for LOOP on Base L2.

**Preferred pairs:** LOOP/ETH, LOOP/USDC

**Contact:** samuel@loopinc.live

---

*This document is provided for informational purposes to prospective liquidity partners. LOOP is a utility token on the Loop_cmbntr governance platform deployed on Coinbase's Base L2 network.*
