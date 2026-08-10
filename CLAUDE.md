# loop-governance — Claude Context

> This file is read automatically by Claude Code at session start.

## What this repo is

A Turborepo monorepo for the Loop community governance platform:
- `apps/console` — member dashboard at **console.loopcmbntr.live** (delegation, accreditation, proposals, elections, treasury, chat)
- `apps/portal` — public site at **gov.loopcmbntr.live** (badges, join flows, campaigns, Power Tree, Stripe checkout for LOOP tokens)
- `apps/admin` — internal ops panel (moderation queue, governance config editor, audit log)
- `apps/mobile` — Expo/React Native iOS + Android app (mirrors console core loop)
- `packages/db` — Drizzle schema + raw SQL migrations (single source of truth for table shapes)
- `packages/contracts` — Solidity/Hardhat (LOOP token contracts on Base L2)
- `packages/config`, `packages/contracts`, `packages/db` — populated shared packages
- `packages/ui` — has `theme.css` (Signal Pulse tokens), `fonts/`, `assets/brand/` as of 2026-08-10 (session `web-06-brand.md`), but no `package.json` yet and nothing imports it — full bring-up (component split, power-tree consolidation) still planned per `sessions/web-eng-plan-output.md` task T1
- `packages/chain`, `packages/email`, `packages/geo`, `packages/governance` — empty directories, not yet built

## Continuity vault

All four docs live at `docs/continuity/`:

**Start every session by reading (in order):**
1. `docs/continuity/SOUL.md` — architecture decisions, prime directives, gotchas
2. `docs/continuity/NEXT.md` — current state, what's in flight, what's next
3. `docs/continuity/LESSONS.md` — hard-won gotchas
4. `ARCHITECTURE.md` — domain model (read if the session touches schema or cross-app changes)

**End every session by updating:**
1. `docs/continuity/WORKLOG.md` — what was done, decisions made, date
2. `docs/continuity/NEXT.md` — status markers, remove completed items, add new items
3. `docs/continuity/LESSONS.md` — add any new gotchas discovered this session

## Session mode check (MANDATORY)

Run `uname -a` at session start:
- **Darwin** → Local (Mac). Full access to local files and vault.
- **Linux** → Cloud sandbox. Cannot reach local vault — stop and tell the user.

## Stack

- **Monorepo tool:** Turborepo + pnpm workspaces
- **Apps:** Next.js 15 (console, portal, admin) + Expo SDK 54 (mobile)
- **Database:** Supabase Postgres (`oztfzqkpwwfnxrydmsuo` — named "loop-trading" for historical reasons)
- **ORM:** Drizzle (schema in `packages/db/src/schema/`) — see SOUL.md for known drift
- **Auth:** Supabase Auth + `@supabase/ssr` (request-scoped client per Next.js App Router)
- **Styling:** Tailwind CSS + shadcn/ui (Next.js apps), React Native StyleSheet (mobile)
- **Payments:** Stripe (portal only, LOOP token purchases)
- **Hosting:** Vercel (console, portal, admin each deployed separately)
- **On-chain:** Base L2 (viem/wagmi via `packages/chain`)
- **Package manager:** pnpm

## Key commands

```bash
pnpm install          # install all workspaces
pnpm build            # build all (Turbo)
pnpm type-check       # tsc --noEmit across all apps
pnpm lint             # ESLint across all apps
pnpm --filter console dev   # dev server for console only (port 3200)
pnpm --filter portal dev    # dev server for portal only (port 3100)
pnpm --filter admin dev     # dev server for admin only (port 3300)
pnpm dev:web                # console + admin + portal together via Turbo (NOT plain `pnpm dev` —
                             # that also launches apps/mobile's interactive Expo process; planned in
                             # sessions/web-devex-checklist.md, not yet added as of 2026-08-10)
```

## Rollback

console, portal, and admin deploy independently on Vercel — a bad deploy to
one never forces a rollback on the others. To revert one app to its last
good production deployment: Vercel dashboard → the app's project
(`loop-console` / `loop-governance` / `loop-admin`) → Deployments → find
the last-good one → "..." menu → Promote to Production. Equivalent via CLI:
`vercel rollback` from within that app's directory. No extra engineering
needed — this is a platform feature, not custom tooling.

## Hard rules

- **Read SOUL.md before making any schema change** — migration 035 has a non-obvious effect on accreditation_scores that breaks any new read path written without knowing it.
- **Never present unvalidated assumptions as truth** — check code, schema, and logs first.
- **Schema changes via `packages/db/migrations/` only** — never direct SQL on production.
- **Never use `createServiceClient()` for user-facing reads** — it bypasses RLS entirely.
- **Drizzle schema (`packages/db/src/schema/`) drifts from live DB** — SQL migrations are source of truth for the live table structure; Drizzle schema is authoritative for new writes only.
- **No `any` type. No `@ts-ignore`. No empty `catch {}` blocks.**
- **`process.env.X!` is a silent failure if the var is missing** — use `requireEnv()` helper (not yet universally applied — 68 open instances as of 2026-07-28; do not add more).

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec

## References

- **Domain model:** `ARCHITECTURE.md`
- **Session prompts:** `sessions/` — each file is a self-contained brief for a specific work arc
- **Bugfix backlog:** `sessions/bugfix-backlog.md`
- **Mobile design:** `DESIGN.mobile.md`
- **Global architecture:** `/Users/samuelbarlow/Documents/Coding Loop Enrolment/ARCHITECTURE.md`
