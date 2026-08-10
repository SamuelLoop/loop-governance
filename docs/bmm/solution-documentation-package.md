# Loop Governance — Solution Documentation Package (SDP)

> Compiled 2026-08-09 for the GBA Global Blockchain Maturity Model (BMM)
> self-assessment (`self-assessment.md` in this folder). Structure follows
> the SDP outline in GBA's "Blockchain Maturity Model Requirements v1.0"
> Appendix C. This is a compilation of what already exists across the repo,
> not new invention — each section links to its actual source.
>
> **Solution in scope:** the Loop Governance platform (console, portal,
> admin, mobile apps + the LOOP token contract on Base L2), not any other
> Loop product on the shared Supabase project (Loop Cmbntr, Loop Bank,
> Loop Canada are separate solutions with their own SDPs, if any).

---

## Plans

### Development & Sustainment Plan

- **Technical plan:** `ARCHITECTURE.md` (domain model, data access pattern,
  testing, quality tooling) and `docs/continuity/SOUL.md` (load-bearing
  architecture decisions, prime directives). `CLAUDE.md` documents the
  stack, key commands, and hard rules enforced across sessions.
- **Development process:** work is broken into self-contained session
  briefs in `sessions/*.md`, each scoped to one arc of work, with a
  continuity vault (`docs/continuity/{SOUL,NEXT,WORKLOG,LESSONS}.md`)
  updated at the start/end of every session so state persists across
  sessions without relying on any one person's memory.
- **Human plan:** currently a single maintainer (Samuel Barlow). No
  documented succession/bus-factor plan exists — flagged as a gap in the
  self-assessment (Infrastructure Sustainability element).
- **Financial plan:** not formally documented as part of this SDP. Loop
  Token's tokenomics (25% impact projects / 25% loyalty scheme, fractional
  equity in associated fund(s)) are described in the Loop white paper and
  `LoopTokenV2.sol`'s own header comment, but a funded operating budget for
  ongoing platform maintenance is not written down anywhere in this repo.

### Security Plan

Built directly from this session's work, 2026-08-09:

- **Smart contracts** (`packages/contracts`): Slither static analysis run
  against `LoopToken.sol`/`LoopTokenV2.sol` — 21 findings, all resolved in
  Loop's own code (0 remaining; the 10 leftover are either the same
  arithmetic pattern Slither always flags regardless of the guarding
  `require`, now commented for a human auditor, or live entirely inside
  vendored OpenZeppelin source). `LoopTokenV2.sol` — the confirmed live
  deployed contract, see "Design" below — has 100% statement/function/line
  coverage and 98.57% branch coverage (`test/LoopTokenV2.test.js`, verified
  via `npx hardhat coverage`).
- **Database** (Postgres/Supabase, shared project `oztfzqkpwwfnxrydmsuo`):
  four migrations applied and live-verified this session closing real,
  confirmed-exploitable holes:
  - `051_treasury_function_hardening.sql` — revoked public API access to
    8 treasury-moving functions/overloads; fixed a double-disbursement
    race condition (missing row lock).
  - `052_voting_function_hardening.sql` — revoked public API access to 10
    voting/scoring functions, including one that was a live, trivial
    vote-stuffing bug (zero auth check on the raw vote-count increment).
  - `053_tighten_governance_rls_policies.sql` — every Row Level Security
    policy on the platform's own tables was scoped to `{public}` rather
    than the intended role, including one that allowed direct
    self-escalation to `platform_admin` with no auth check at all;
    tightened to real ownership checks or `service_role`-only.
  - `054_restore_recompute_power_score_grant.sql` — a targeted correction
    found by functional (not just static) re-testing.
  - Full findings, evidence, and live verification steps for each:
    `sessions/security-0{1,2,3,4}-*.md` and `sessions/security-05-audit-readiness-and-bmm.md`.
  - Also fixed at the application layer (not just the database): three
    Next.js server actions in `apps/console` trusted a client-submitted
    user ID with no session verification, allowing vote/proposal/delegation
    spoofing — fixed in `castVote`, `createProposal`, `createDelegation`,
    `revokeDelegation` (`sessions/security-03-treasury-function-audit.md`
    has the detail).
- **Not yet done:** no third-party smart-contract audit (this SDP exists
  in part to prepare for commissioning one — see the self-assessment's
  Security element for the honest current rating). Contract ownership is
  still a single EOA, not a multisig/timelock (open item, tracked in
  `docs/continuity/NEXT.md`).

### Risk Management Plan

No standalone risk register exists yet. The closest equivalent is the
"Blocked / needs verification" and "Do not touch without reading SOUL.md
first" sections of `docs/continuity/NEXT.md`, plus the specific risks
identified and closed in the security sessions above. Notable open risks,
carried forward from this session's findings:

- Single-EOA contract ownership (owner key compromise = total contract
  control, no second signer required).
- No external smart-contract audit yet.
- Loop Cmbntr's tables on the same shared Supabase project have the
  identical RLS exposure pattern just fixed here — flagged as a separate
  task, not yet remediated (different product, different owner).
- Mobile distribution status (App Store / TestFlight / Google Play) is
  itself listed as "unknown, verify" in `docs/continuity/NEXT.md`.

### Continuity of Operations Plan (COOP)

- **Database:** Supabase-managed Postgres. Point-in-time recovery and
  backup configuration are Supabase project settings, not something
  configured or documented in this repo — not confirmed as part of this
  SDP; flagged as an open item.
- **Hosting:** console, portal, and admin each deploy independently via
  Vercel (git-integrated). No documented failover/rollback runbook exists
  beyond Vercel's own deployment history and rollback UI.
- **On-chain:** the LOOP token contract itself has no separate continuity
  mechanism — Postgres is the primary record for governance state per
  `ARCHITECTURE.md`; the chain sync (`chain_tx_hash` columns) is
  secondary, not the system of record.

---

## Requirements

Primary source: `project_governance_product_definition.md` (Samuel's
project memory) and `ARCHITECTURE.md`. Core requirements as actually
implemented:

- Fractal community hierarchy (micro → local → city → state → national →
  continental → global), public and private community modes.
- Liquid democracy: transitive vote delegation scoped to
  `(delegator_id, community_id, subject_tag)`.
- Peer accreditation feeding a PageRank-style influence score, computed
  per-subject platform-wide (migration 035).
- Proposal → vote → treasury cascade, with governance-motivation payouts
  to voters, bounded by an admin-configurable hard cap.
- LOOP utility token (Base L2): on-chain purchase, off-chain
  (Stripe/crypto) purchase with server-mediated minting, allocation
  direction to communities, impact-treasury mechanics.
- Anti-fragmentation: community-creation similarity detection, merge
  proposals (per product definition — implementation status not verified
  as part of this SDP).
- Identity/KYC/biometric verification: **documented as a future
  requirement in the product definition, not yet implemented** — see the
  Identity Management element in the self-assessment.

---

## Design

- **Domain model and data flow:** `ARCHITECTURE.md` in full — communities
  tree, delegation vs. accreditation, treasury cascade, on-chain sync
  model, auth/data-access pattern (`createClient()` RLS-respecting vs.
  `createServiceClient()` service-role).
- **Smart contract design:** `packages/contracts/src/LoopTokenV2.sol`,
  self-documented in its own header comment (tokenomics: N tokens to
  buyer, N/2 to impact treasury, N/2 to allocation balance per purchase).
  **`LoopTokenV2` is the only deployed contract** — confirmed 2026-08-09 by
  matching `packages/contracts/.env` and all three Next.js apps'
  `.env.local` `NEXT_PUBLIC_LOOP_TOKEN_ADDRESS` values, and by
  `apps/console/src/lib/loop-token.ts` / `apps/admin/src/lib/loop-token.ts`
  both being explicitly commented as the V2 client. `LoopToken.sol` (V1)
  exists in the repo but was never deployed — flagged for deletion in
  `docs/continuity/NEXT.md`, not yet done.
- **Database schema:** `packages/db/migrations/*.sql` is the source of
  truth for live table structure (the Drizzle schema in
  `packages/db/src/schema/` has known drift — see `SOUL.md`).

---

## Operations

- **Deployed state** (`docs/continuity/NEXT.md`): console
  (console.loopcmbntr.live), portal (gov.loopcmbntr.live), and admin are
  live on Vercel. Mobile is built for iOS + Android; app-store/TestFlight
  distribution status is explicitly unverified.
- **Ops tooling:** admin app provides a moderation queue, governance
  config editor, and audit log (`admin_audit_log`, now correctly
  service-role-restricted as of this session — see Security Plan above).
- **Cron/scheduled jobs:** nightly accreditation-score refresh
  (`refresh_all_accreditation_scores`, now access-restricted to
  service_role), PageRank incremental-queue processor
  (`apps/portal/src/app/api/cron/refresh-pagerank`), expired-allocation
  sweep (`apps/console/src/app/api/cron/sweep-expired-allocations`).

---

## Solution Verification

- **Static analysis:** Slither (contracts) — see Security Plan.
- **Test coverage:** `LoopTokenV2.sol` 100%/100%/100%/98.57%
  (stmts/funcs/lines/branch). `apps/portal` has a real Vitest suite
  (`src/__tests__/scaling/`). **`apps/console` and `apps/mobile` have zero
  automated test coverage** — open item, `docs/continuity/NEXT.md` item 4.
- **Live functional verification (2026-08-09):** every database-layer
  security fix this session was verified against the actual live Supabase
  project, not just written — using `SET ROLE` inside rolled-back
  transactions to simulate real `anon`/`authenticated`/`service_role`
  sessions and confirm both that the fix blocks the exploit and that
  legitimate app flows (including a real regression this caught, see
  `security-02`'s writeup) still work. Full evidence trail in each
  `sessions/security-0N-*.md` file.
- **Type/lint baseline:** `pnpm type-check` and `pnpm lint` pass clean
  across all four apps as of the 2026-07-28 health-check session.

---

## Performance Reporting

No formal load-testing or capacity benchmarks exist as a standalone
report. Real, targeted performance work has been done and is documented
in `sessions/scale-0{1..5}.md`: DB indexes on hot paths, materialised
vote/proposal counts (vs. live aggregation), OG-image caching + rate
limiting, connection pooling via Supabase's transaction pooler, and a
Realtime-subscription audit. A further scaling arc
(`NEXT-SESSION-scaling-power-scores.md`) is scoped but not yet started —
covers KV-caching power stats, moving score computation from read-time to
write-time, and incremental (vs. nightly-batch) PageRank updates.
