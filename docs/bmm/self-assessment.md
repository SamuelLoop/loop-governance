# Loop Governance — BMM Self-Assessment

> Internal self-assessment against the GBA Global Blockchain Maturity
> Model (BMM) Requirements v1.0, compiled 2026-08-09. This is what the
> review-board contact who flagged the Loop Token audit/BMM gap asked
> for — an internal SPOC (Samuel Barlow) rating the solution, backed by
> real evidence, before any formal GBA-facilitated assessment.
>
> **Rating scale** (BMM v1.0 §1.4): Level 1 Initial → Level 2 Documented →
> Level 3 Validated → Level 4 Production → Level 5 Optimizing. A platform
> maturity rating requires every element to clear the same minimum level —
> the weakest element caps the whole rating, not the average.
>
> These ratings are deliberately calibrated to the evidence actually
> gathered this session, not aspirational. Where evidence is thin, the
> rating says so and names exactly what's missing to move up a level.

---

## Summary

| Element | Level | One-line reason |
|---|---|---|
| Distribution | **1** | Base L2 sequencer dependency; contract owned by a single EOA |
| Governance | **4** | Real, deployed liquid-democracy mechanism, live in production |
| Identity Management | **1** | KYC/biometric Sybil-resistance is a documented future requirement, not built |
| Interoperability | **2** | Standard ERC-20 on Base; no formal interop testing documented |
| Performance | **2** | Real targeted fixes shipped (scale-01..05); no formal capacity benchmarks |
| Privacy | **2** | Public/private community model designed; RLS gaps just closed, not independently audited |
| Reliability | **2** | Live in production on Vercel; no SLA/uptime tracking documented |
| Resilience | **1** | No documented/tested backup or failover procedure |
| Security | **3** | Extensive internal hardening + static analysis this session; no third-party audit yet |
| Infrastructure Sustainability | **1** | Single maintainer; no funded ops budget or succession plan documented |
| Synchronization | **2** | Documented Postgres-primary / chain-secondary model; not independently tested |

**Platform-wide effective level: 1** (Distribution, Identity Management,
Resilience, Infrastructure Sustainability). Governance and Security are
the strongest elements by a wide margin — everything else needs
deliberate work before a credible Level 2+ platform rating, let alone
what a paid audit or formal GBA assessment would require.

---

## Element detail

### Distribution — Level 1 (Initial)

The solution runs on Base L2, which is itself distributed, but Loop's own
contribution to that distribution is thin: `LoopTokenV2.sol`'s owner is a
single Externally Owned Account (confirmed live this session — no
multisig/timelock deployed yet; `transferToHardwareWallet()` exists in
the contract but there's no evidence it's been called). Level 3 requires
no single entity holding administrative control of more than 50% of
relevant infrastructure — a single-key contract owner fails this
outright, independent of Base's own decentralization.

**To reach Level 2:** document the distribution/decentralization posture
explicitly (even if the honest answer is "we inherit Base's, and our own
contract admin is centralized by design for now").
**To reach Level 3:** move contract ownership to a multisig (tracked as
an open item in `docs/continuity/NEXT.md`).

### Governance — Level 4 (Production)

The strongest element. Real, deployed mechanisms: transitive vote
delegation, peer accreditation feeding a PageRank-style score, proposal →
vote → treasury cascade with capped governance-motivation payouts, admin
role hierarchy (`platform_admin`/`org_admin`/`org_manager`). All of this
is live in production (console.loopcmbntr.live, gov.loopcmbntr.live),
not a prototype. What was found and fixed this session (privilege
escalation via `admin_assignments`, vote-count manipulation, treasury
function exposure) is exactly the kind of production hardening Level 4
implies is needed and has now happened — see the Security Plan in
`solution-documentation-package.md`.

**Not Level 5:** scaling work for the power-score/tree computation is
explicitly scoped but not started (`NEXT-SESSION-scaling-power-scores.md`)
— Level 5 requires demonstrated ability to scale while maintaining
consistent performance, which hasn't been shown yet at any real load.

### Identity Management — Level 1 (Initial)

The product definition (`project_governance_product_definition.md`)
explicitly names KYC/AML and biometric verification as required "eventually
(real money at stake)" and states "one person = one identity is critical
for the liquid governance model to work" — but this is a stated intent,
not implemented. Current auth is standard Supabase Auth (email/OAuth);
nothing in the codebase enforces Sybil resistance. This is a real gap
given the platform's own liquid-democracy model depends on one-person-one-
identity to mean anything.

**To reach Level 2:** write the actual identity-verification design (not
just the one-paragraph product-doc mention) — what KYC provider, what
biometric method, what the enrollment flow looks like.

### Interoperability — Level 2 (Documented)

LOOP is a standard `ERC20`-extending contract (OpenZeppelin) on Base L2 —
this is inherently interoperable with the broader EVM/token ecosystem.
No formal interoperability testing (cross-chain, cross-wallet
compatibility matrix) is documented.

### Performance — Level 2 (Documented), bordering Level 3

Real, shipped performance work exists (`sessions/scale-01..05.md`): DB
indexes on hot paths, materialised vote/proposal counts, OG-image caching
+ rate limiting, Supabase transaction-pooler connection pooling, a
Realtime-subscription audit. This is genuine Validated-level evidence for
the specific bottlenecks addressed. What's missing for a clean Level 3:
no formal capacity/throughput benchmark exists as a standalone
reproducible report (the fixes were reactive to identified bottlenecks,
not derived from a documented performance requirement + test).

### Privacy — Level 2 (Documented)

The public/private community model (visibility field, private = invite-
only + internal-transparency-only, public = open + power-trees-public-but-
member-lists-private) is a real, designed privacy boundary
(`project_governance_product_definition.md`). This session closed a real
privacy-relevant gap — RLS policies that let any caller read/write tables
they shouldn't — but that fix hasn't been independently verified by
anyone other than the person who made it (standard limitation of a
self-assessment; this is exactly why the BMM process has an external
assessor review step).

### Reliability — Level 2 (Documented)

Live in production on Vercel (console/portal/admin) since at least
2026-07-24 per deployment history in `project_loop_governance.md`. No SLA,
uptime tracking, or error-budget documentation exists in this repo.

### Resilience (Fault Tolerance) — Level 1 (Initial)

No documented or tested backup/restore procedure, no documented failover
plan beyond "Vercel redeploys and Supabase is a managed service." Whether
Supabase's point-in-time recovery is even configured for this project
was not confirmed as part of this assessment — flagged as an open item.

**To reach Level 2:** write the actual COOP (see
`solution-documentation-package.md`'s Continuity of Operations Plan
section, which is currently mostly "not confirmed").

### Security — Level 3 (Validated), the second-strongest element

This is where the bulk of this session's work landed, and it's real,
verified evidence, not just documentation:
- Slither static analysis on the contracts, findings resolved, re-run to
  confirm.
- 100%-coverage test suite on the live deployed contract.
- Four database migrations closing confirmed-live, confirmed-exploitable
  holes (privilege escalation, vote-stuffing, treasury-function exposure,
  wide-open RLS), each one **verified against the live system** with real
  `SET ROLE` sessions inside rolled-back transactions — not just written
  and assumed correct.
- An application-layer identity-spoofing bug found and fixed across four
  Next.js server actions.

This clears Level 3 ("adequate evidence that the solution demonstrates it
functions as intended... satisfy its operational requirements") on the
strength of that verification work. **Not Level 4**: Level 4 requires
evidence the solution "works as intended... together with all the other
parts," at production-scale confidence — the honest gap is that none of
this has been reviewed by anyone external, and there is still no
third-party smart-contract audit. That audit, once commissioned, is what
would credibly move this to Level 4.

### Infrastructure Sustainability — Level 1 (Initial)

No documented funding/staffing plan beyond the fact that Samuel Barlow
currently builds and maintains the whole platform. No bus-factor
mitigation, no documented operating budget for ongoing infra costs
(Supabase, Vercel, RPC providers). This is the most honest gap to name
plainly: a platform can be technically well-built and still fail this
element if its continuity depends on one person with no written plan for
what happens if that stops.

### Synchronization — Level 2 (Documented)

The Postgres-primary / on-chain-secondary consistency model is explicitly
documented in `ARCHITECTURE.md` ("the Postgres tables are the primary
record; the chain sync is a secondary write, not the source of truth for
app reads"). This is a real, coherent design decision, not an accident —
but it hasn't been independently tested for what happens under sync
failure (e.g. a chain write fails after the Postgres write commits — is
there a reconciliation process? Not found in this repo).

---

## What would move the platform-wide rating

Given a rating is capped by the weakest element, the highest-leverage
next steps are the four Level-1 elements, roughly in order of effort:

1. **Distribution** — deploy a multisig (Gnosis Safe) + timelock for
   contract ownership. Already scoped as an open item, mechanically
   straightforward, mostly gas cost.
2. **Infrastructure Sustainability** — write down the actual sustainment
   plan, even if the honest current answer is thin. This is pure writing,
   zero engineering cost, and directly closes the gap.
3. **Resilience** — confirm and document Supabase's actual backup/PITR
   configuration for this project; write a one-page COOP.
4. **Identity Management** — this is the biggest real gap and the one
   with no quick fix; it needs an actual design decision (which KYC/
   biometric approach) before there's anything to document, let alone
   implement.
