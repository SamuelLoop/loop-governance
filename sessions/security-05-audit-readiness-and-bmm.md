# Loop Governance: audit readiness + BMM self-assessment prep — 2026-08-09

## Context

Triggered by an external message about Loop Token: a review-board contact
for the GBA Global Blockchain Maturity Model (the "UN BMM" — recognized by
the UN Internet Governance Forum's Blockchain Dynamic Coalition) flagged two
gaps before they'll pair/list: (1) no visible smart-contract audit badge,
(2) no BMM self-assessment on file.

Decision: do not reply to them yet. First get the platform to a state where
both gaps can be closed for real — free/internal work first, then a paid
audit — rather than promising a badge that doesn't exist yet.

This session consolidates that work into one prioritized backlog, split
free vs paid. It supersedes nothing — `security-01` through `security-04`
and `bugfix-backlog.md` are still the source of truth for their own scope;
this file sequences them plus the new contract-hardening and BMM-prep work
around them.

---

## PART A — Free work (internal time only, no external spend)

### A1. Smart contract hardening — `packages/contracts`

Ran Slither (Trail of Bits' free, open-source static analyzer) against
`LoopToken.sol` and `LoopTokenV2.sol` on 2026-08-09. Result: **0 high/critical,
0 medium — 21 low/informational findings**, all mechanical fixes:

| Finding | Count | Fix |
|---|---|---|
| `divide-before-multiply` (`amount/2` then `*10**decimals()`) | 3 | Not exploitable — `purchase()`/`mintForPurchase()` already `require(amount % 2 == 0)` so no truncation occurs. Add a comment explaining why, so an auditor doesn't have to re-derive it. |
| `missing-zero-check` on `impactTreasury` (constructor) and `swapContract` (setter) | 3 | Add `require(_x != address(0))` — same pattern already used elsewhere in the contract |
| Inconsistent/outdated Solidity pragma versions across OZ imports vs contract (`^0.8.20` vs `^0.8.24`) | 5 | Pin an explicit compiler version (not `^`) in `hardhat.config.js`; bump OZ to latest 5.x |
| `naming-convention` (`_swapContract` param) | 2 | Cosmetic rename |
| `reentrancy-unlimited-gas` — event emitted after `.transfer()` in `purchase()` | 2 | Low risk (`.transfer()` caps forwarded gas at 2300, and no state is written after the external call — only an event). Reorder event-before-transfer anyway for clean checks-effects-interactions, since an auditor will flag the pattern even if it's not exploitable here. |
| `unindexed-event-address` (`TreasuryUpdated`, `SwapContractSet`, OZ `Paused`/`Unpaused`) | 6 | Add `indexed` to address params — free, improves off-chain indexing |

**Status: done, 2026-08-09.** Applied to both `LoopToken.sol` and
`LoopTokenV2.sol`: pinned pragma to exact `0.8.24` (was `^0.8.24`), added
zero-checks on `_impactTreasury` (V1 constructor) and `setSwapContract`,
renamed `_swapContract` params to `newSwapContract`, indexed
`TreasuryUpdated`/`SwapContractSet` event params, reordered `purchase()` so
the `TokensPurchased` event emits before the refund's external `.transfer()`
call, and added inline comments explaining why the `amount / 2` divisions
are safe (guarded by `amount % 2 == 0`).

Verified: `npx hardhat compile --force` clean, all 12 existing
`LoopToken.test.js` tests still pass, Slither re-run dropped from
**21 → 10 findings**. The remaining 10 are not fixable from our side:
3 are the same divide-before-multiply pattern (Slither flags the arithmetic
shape regardless of the guarding `require` — now commented for a human
auditor, but the tool can't read comments) and 7 are pragma/solc-version/
unindexed-event findings entirely inside vendored OpenZeppelin source
(`Ownable`, `ERC20`, `Pausable`, `Context`) — not our code, not worth
forking OZ to silence. **Net: 11 of 11 findings in Loop's own code are
resolved.**

**Status: done, 2026-08-09.** Wrote `test/LoopTokenV2.test.js` — 44 tests
covering every external function (`purchase`, `mintForPurchase`,
`directAllocation`, `directAllocationFor`, `exchangeForAdvertising`,
`transferImpactTreasury` — both its owner-is-treasury and
owner-needs-allowance branches, all four admin setters, `pause`/`unpause`
including that paused blocks every state-changing entrypoint,
`withdraw`, `transferToHardwareWallet` including that the old owner loses
access after transfer). All 44 pass; combined with V1's 12, full suite is
56 passing. Ran `npx hardhat coverage` (solidity-coverage, bundled in
hardhat-toolbox, free): **`LoopTokenV2.sol` is 100% statements, 100%
functions, 100% lines, 98.57% branch.**

`LoopToken.sol` (V1) is lower — 65.63% stmts / 39.13% branch — but this is
moot: confirmed 2026-08-09 that **V1 was never deployed.** `packages/
contracts/.env` and all three apps' `.env.local` (console, admin, portal)
point at the same live address, and `apps/console/src/lib/loop-token.ts` /
`apps/admin/src/lib/loop-token.ts` are both explicitly commented "LoopTokenV2
client" with an ABI matching V2's function set. V1 is dead code — no
on-chain deployment, nothing references it outside `packages/contracts`
itself.

**Recommendation:** delete `src/LoopToken.sol`, `test/LoopToken.test.js`,
and `scripts/deploy.js` (V1-only) before commissioning a paid audit. Every
line of dead contract code is scope an auditor bills hours to read — this
is a free way to shrink (and cheapen) the audit, not just a cleanup. Needs
your go-ahead since it's a deletion, not a hardening edit.

- Add Echidna or Foundry-style invariant/fuzz tests for the properties that
  actually matter economically: `totalSupply` conservation across
  purchase/mint paths, `allocationBalance[x]` never negative, treasury
  split always sums correctly. This is the kind of evidence BMM's
  Security and Reliability elements want and it's free (Echidna is
  open-source). Not yet done.
- Add Echidna or Foundry-style invariant/fuzz tests for the properties that
  actually matter economically: `totalSupply` conservation across
  purchase/mint paths, `allocationBalance[x]` never negative, treasury
  split always sums correctly. This is the kind of evidence BMM's
  Security and Reliability elements want and it's free (Echidna is
  open-source).
- **Single-owner EOA risk.** Every privileged function is `onlyOwner` on a
  single address. `transferToHardwareWallet()` already exists in V2 —
  confirm whether it's actually been called on any deployed instance. Before
  a paid audit, strongly consider: (a) moving `owner()` to a Gnosis Safe
  multisig (free to deploy, only gas cost — cents on Base L2) instead of a
  single hardware wallet, and (b) adding an OpenZeppelin `TimelockController`
  in front of admin functions (treasury moves, price changes). Both are
  free (OZ contracts), both directly strengthen the BMM Governance and
  Security element ratings, and both are things auditors flag hard when
  absent — "single EOA with unlimited mint/treasury-drain power" is a
  standard top-of-report finding.

### A2. Close out the existing security backlog

Already-scoped, not yet confirmed done (check `docs/continuity/NEXT.md` —
not listed under "what is built and working" as of 2026-08-09):
- `sessions/security-02-permissive-rls-policies.md` — review 21 `USING/WITH
  CHECK (true)` policies
- `sessions/security-03-treasury-function-audit.md` — audit 6 SECURITY
  DEFINER functions that move LOOP/treasury/loyalty value
- `sessions/security-04-voting-function-audit.md` — audit 11 SECURITY
  DEFINER functions controlling votes/scores

These three are the highest-signal free work available — they're audits of
exactly the kind of thing a professional reviewer will ask about
("who can call this, and what stops abuse"), already scoped, just not
executed yet.

### A3. Bugfix backlog (`sessions/bugfix-backlog.md`)

- 68 unchecked `process.env.X!` — silent-failure risk, `requireEnv()`
  helper exists, just needs applying call-site by call-site
- Console has zero test coverage — most user-facing app, highest exposure
- 5 failing admin test assertions (FK fixture issue)

### A4. Compile the Solution Documentation Package (SDP) for BMM

GBA's own template (from `Blockchain Maturity Model Requirements v1.0`,
Appendix C) wants: Development & Sustainment Plan, Security Plan, Risk
Management Plan, Continuity of Operations Plan, Requirements, Design,
Operations docs, Solution Verification evidence, Performance Reporting.

Loop already has most of the raw material — this is compilation, not
invention:
- `docs/continuity/SOUL.md` + `ARCHITECTURE.md` → Design + Requirements
- `docs/continuity/NEXT.md` + `WORKLOG.md` → Development & Sustainment Plan
- The security-01..04 sessions once closed out → Security Plan
- Supabase backup/PITR settings (document what's configured) → Continuity
  of Operations Plan
- Slither report + test coverage report → Solution Verification evidence

### A5. Self-assessment against the 11 BMM elements

This is the specific thing the reviewer said they hadn't seen — and it's
free. It's an internal SPOC (Samuel, or a delegate) rating the solution
Level 1-5 against: Distribution, Governance, Identity Management,
Interoperability, Performance, Privacy, Reliability, Resilience, Security,
Infrastructure Sustainability, Synchronization. Governance is Loop's
strongest element by far (liquid democracy, quorum leaders, treasuries —
see `project_governance_product_definition` memory) — lead with it.

**Do A1-A4 before A5** — the self-assessment is more credible (and more
likely to survive GBA's review without an expensive back-and-forth) if it's
rating a hardened contract and a closed security backlog rather than the
current state.

---

## PART B — Paid work (external spend, needs a quote/decision)

| Item | Typical cost (2026 market) | Notes |
|---|---|---|
| **Smart contract audit** (boutique/mid-tier firm — LoopToken is a ~250-line ERC20 extension, not a complex DeFi protocol) | **$5,000–$15,000** | Simple/well-scoped ERC20 audits land here (CyberScope, QuillAudits, H-X Technology, smaller Hacken engagements). Get 2-3 quotes once Part A is done — a hardened, well-tested contract with a Slither report attached will price toward the low end. |
| **Smart contract audit** (top-tier firm: CertiK, Trail of Bits, OpenZeppelin) | $30,000–$100,000+ (enterprise engagements can run to $200k) | Buys more brand recognition (badge weight) but is overkill for the current contract's complexity. Consider only if a specific exchange partner requires a named top-tier firm. |
| **Competitive audit** (Code4rena / Sherlock / Cantina contests) | $30,000–$60,000+ pooled bounty | Different model — public contest, many researchers, often better bug coverage per dollar than a single boutique firm, but needs a larger/more mature codebase to attract researchers. Probably premature for LoopToken's current size. |
| **GBA BMM formal/certified assessment** | GBA's own site says "typically... tens of thousands of dollars" for the full assessment; a separate, undisclosed "Assessment Review Fee" applies even after a self-assessment | **Get a real quote via GBA's proposal form before committing** — this is the one item where published pricing is vague. The reviewer only said "at least a self-assessment" is needed — confirm with GBA (or just proceed with A5 first) whether the unpaid self-assessment alone satisfies what this particular reviewer wants, before paying for the certified version. |
| Gnosis Safe multisig | ~$0 (gas only, cents on Base L2) | Not really a paid item — listed for completeness since it's part of the audit-readiness story |
| Bug bounty (Immunefi or similar) | Ongoing — platform fee + bounty pool you set (from a few $k up) | Optional, complements rather than replaces an audit. Worth doing after the audit, not instead of it. |
| Legal opinion on token classification (securities analysis) | ~$3,000–$15,000 | Not asked for by this reviewer, but adjacent — some exchanges/partners want this alongside an audit before pairing. Flag as a possible future ask, not a current action item. |

**Recommended sequencing:** A1 → A2/A3 → A4/A5 → get 2-3 audit quotes with
the hardened contract + Slither/coverage reports attached → confirm BMM fee
structure with GBA directly → then decide spend.

## What success looks like

- Slither: 0 findings (or documented/justified exceptions) on both contracts
- `LoopTokenV2.sol` has full test coverage + at least one invariant/fuzz test
- Owner role moved off a single EOA (multisig + timelock)
- security-02/03/04 closed, findings documented
- SDP compiled as an actual doc set, not scattered across session files
- Internal BMM self-assessment completed and dated
- 2-3 real audit quotes in hand with $ and timeline
- GBA fee structure confirmed directly (not assumed from published ranges)
