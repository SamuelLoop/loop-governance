# Web: space-tint addendum + real Glass/LiveDot components — 2026-08-11

## Why this session exists

`sessions/web-03-frontend-design.md` already specced a full component
inventory (`Glass`, `LiveDot`/`LiveTag`, `TierPill`, `ChatMessage`,
`StatusChip`, etc. — see `sessions/web-frontend-design-output.md`) and
`sessions/web-eng-plan-output.md` already committed to Admin → Console →
Portal as the rollout order. None of that inventory has been built as real
`packages/ui` components yet — the only page using anything close to the
"glass panel" look is the community chat
(`apps/console/src/app/(dashboard)/communities/[id]/chat/`), built ad hoc
today (2026-08-11), before this addendum existed, with one-off CSS classes
in `apps/console/src/app/globals.css` (`.live-dot`, `.leadership-glow`,
`.community-shade`) instead of shared components.

This session has two jobs: (1) formalize a pattern discovered live during
that build — tinting a surface by *whose space it is*, not just what it
contains — as a real addendum to `DESIGN.web.md`, and (2) retrofit chat
onto real `packages/ui` primitives so the next three rollout sessions
(09/10/11) have an actual component to reuse instead of copy-pasting CSS.

## The pattern: space-tint (new, not in `DESIGN.web.md` today)

`DESIGN.web.md` already has two colour signals that never mix: tier colour
(status) and the brand gradient (action). This adds a third, narrower one:
**which audience a panel belongs to**, used only on structural chrome
(panel background/border), never on text, buttons, or data — so it can't
collide with the existing two rules.

| Space | Tint | Where it means something |
|---|---|---|
| Community / general | Flat neutral shade, `#17171b` dark / `#e9eaee` light | Any panel open to all members |
| Leadership / restricted | Static blue-violet gradient border (`color-mix` off `--accent-end`) + a "Members only" pill | Any panel restricted to quorum/leadership roles |
| Admin | **Proposed: teal** (see below) | Any panel that's `apps/admin`-only, or an admin-only control embedded in console (e.g. a moderation action on a member row) |

**Admin colour — needs your sign-off, not yet in `DESIGN.web.md`:** every
other saturated hue in the system is already spoken for (blue-violet =
brand, gold = warning + Gold tier, green = success, red = error, plus
Diamond/Platinum/Silver/Bronze). Proposing **teal** (`#2dd4bf`-ish family) —
distinct from all of those, reads as "oversight/verified" rather than
alarm or celebration, and admin currently has zero accent identity
(`DESIGN.web.md`: "No dedicated exploration yet — inherits the console
dark palette"). If you'd rather pick a different hue, swap it here before
session 09 runs — everything downstream reads from this file.

**Explicit rule, matching the existing tier/brand-accent discipline:**
space-tint only ever appears as background/border treatment on a
`Glass`-family panel. It never appears on body text, on a button's fill,
or as a data-viz colour — those stay governed by the existing rules
untouched.

**Motion:** the leadership tint was originally a rotating conic-gradient
border; reverted same-day to static after direct feedback that continuous
motion was distracting. Keep it static. `LiveDot` (small pulsing status
dot, 1.6s, `prefers-reduced-motion`-gated) is the only thing in this
pattern that's allowed to move, and only when it reflects a real Realtime
subscription — never decoratively.

## Deliverables

1. **`DESIGN.web.md`**: new "Space-tint" section, written like the
   existing Tier/Brand-accent sections (token table, the "never mixes
   with" rule, a Decisions Log entry dated today).
2. **`packages/ui/theme.css`**: promote `--admin-tint` (or whatever hue
   gets picked) alongside the existing `--accent-start`/`--accent-end`
   tokens, following the same `color-mix()`-based pattern already proven
   in `globals.css`'s `.leadership-glow`.
3. **Real components in `packages/ui/src/components/`** (per the session
   3 inventory, finally built):
   - `Glass` — base panel primitive (`bg-surface`, `backdrop-blur`,
     `rounded-panel`, `border-surface-border`), with a `space` prop:
     `"community" | "leadership" | "admin" | undefined` applying the
     tint. Undefined = todays's plain glass panel, used everywhere else.
   - `LiveDot` — extract from `globals.css`'s `.live-dot` into a real
     component so it stops being copy-pasted CSS.
4. **Retrofit `apps/console/.../chat/`** onto `<Glass space="community">`
   / `<Glass space="leadership">` instead of the one-off
   `.community-shade`/`.leadership-glow` classes — same visual result,
   now it's the reference implementation other pages actually import
   rather than re-derive.
5. Verify: `pnpm --filter console run build` clean, chat visually
   unchanged (screenshot diff against the current live deploy).

**Standing rule, this whole session chain (08-11), per `docs/continuity/
NEXT.md`'s "Post-deploy correction" entry:** portal's Signal Pulse rollout
shipped once already without a live sign-off checkpoint and had to be
reverted after breaking the real site. Get an explicit visual sign-off
from the user — a screenshot or artifact they actually look at, not a
design doc — before any of sessions 08-11 deploys to production, not
after.

Save outputs to: `sessions/web-08-space-tint-output.md`
