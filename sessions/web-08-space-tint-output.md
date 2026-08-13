# Web session 08 output: space-tint addendum + real Glass/LiveDot components — 2026-08-13

Brief: `sessions/web-08-space-tint-addendum.md`. All 5 deliverables done.

## 1. Admin tint colour — confirmed

Mocked up as a real artifact (not a swatch in prose, per standing project
convention): three candidates — **A `#2dd4bf`** (the brief's own proposal),
B `#14b8a6` (deeper/more muted), C `#06b6d4` (cyan, cooler) — rendered as
actual `Glass`-panel treatments (same gradient-border math the shipped
leadership tint uses) next to the already-shipped Community/Leadership
tints, on the real console dark background. User picked **A, `#2dd4bf`**.

## 2. `DESIGN.web.md`

New "Space-tint — panel ownership" section added directly after "Tier
colour vs. brand accent — the resolution", same structure (token table,
the "never mixes" rule, a Decisions Log entry dated 2026-08-13). 3 new
rows in the Decisions Log.

## 3. `packages/ui/theme.css`

`--admin-tint: #2dd4bf` added alongside `--accent-start`/`--accent-end` in
the dark-identity `:root` block (§6), with a comment explaining the
space-tint rule and why it's unchanged between light/dark like the accent
tokens. Mapped into the `@theme inline` block as `--color-admin-tint` for
Tailwind utility access. The `live-pulse` `@keyframes` (previously only in
`apps/console/src/app/globals.css`) also moved here, since `LiveDot` is no
longer console-only — noted in the Motion section (§5) comment.

## 4. Real components — `packages/ui/src/components/`

- **`glass.tsx`** — `Glass` primitive. `space` prop: `"community" |
  "leadership" | "admin" | undefined`. Undefined renders the plain glass
  panel every other page already uses (`bg-surface`, `backdrop-blur`,
  `rounded-panel`, `border-surface-border`) — unchanged. `"community"`
  swaps in the flat neutral shade (`bg-[#e9eaee] dark:bg-[#17171b]`,
  Tailwind's `dark:` custom variant, same selector logic as the original
  `.community-shade`/`[data-theme="light"] .community-shade` pair).
  `"leadership"`/`"admin"` render the two-div gradient-border-wrap pattern
  (1px padding gradient outer, `bg-surface` inner), sourcing the hue from
  `--accent-end` or `--admin-tint` respectively — byte-identical CSS math
  to the original `.leadership-glow`, just parameterised by hue.
- **`live-dot.tsx`** — `LiveDot`, extracted from `.live-dot`. Same 1.6s
  ease-in-out pulse via the `live-pulse` keyframes (now in theme.css),
  `motion-reduce:animate-none` fallback preserved.

Both exported from `packages/ui/src/index.ts`.

## 5. Retrofit — `apps/console/.../communities/[id]/chat/dual-chat-panel.tsx`

`DualChatPanel`'s two wrapper divs replaced with `<Glass space="community">`
/ `<Glass space="leadership">`; `ThreadPanel`'s `<span className="live-dot">`
replaced with `<LiveDot>`. `ThreadPanel` is shared by both `DualChatPanel`
(desktop) and `ChatMobileLayout` (mobile tabs), so the `LiveDot` swap covers
both surfaces from one edit. The dead CSS (`.live-dot`, `@keyframes
live-pulse`, `.leadership-glow`, `.community-shade`, the reduced-motion
block) removed from `apps/console/src/app/globals.css` — confirmed via grep
first that nothing else in the repo referenced any of those four classes.

**Verification:**
- `pnpm --filter @loop/ui run type-check` — clean.
- `pnpm --filter console run type-check` — clean.
- `pnpm --filter console run build` — clean, exit 0. `/communities/[id]/chat`
  route compiles (5.38 kB, 216 kB First Load JS). ESLint (part of `next
  build`) reported 0 errors, only pre-existing warnings in unrelated files
  (same warnings session 7 already noted as pre-existing).
- **Compiled-CSS check** (the repo's own proven method, LESSONS.md #13):
  grepped the actual production CSS chunk for every token/utility this
  change touches, confirming nothing got silently purged or mis-emitted:
  `--admin-tint:#2dd4bf` present; `@keyframes live-pulse{...}` present;
  `.rounded-panel{border-radius:.75rem}` present; `.bg-surface{background-
  color:var(--surface)}` present; `--tw-backdrop-blur:blur(var(--blur-
  glass))` present; `.rounded-[calc(var(--radius-panel)+1px)]` present;
  `.dark\:bg-\[#17171b\]:is([data-theme=dark] *){background-color:#17171b}`
  and `.bg-\[#e9eaee\]{background-color:#e9eaee}` both present (the
  community light/dark pair, exact hex match to the original ad hoc CSS).
  The gradient-border `background`/`box-shadow` and the leadership/admin
  hue math are applied via inline React `style`, not Tailwind utilities, so
  they don't appear in the compiled CSS file at all — expected, not a gap.
- **Not done: a real logged-in screenshot.** Starting the console dev
  server was blocked by this session's own tool-permission classifier (not
  a code issue) — real seeded test credentials exist for this
  (`scripts/seed-users.mjs`: `diana@looptest.dev` / `LoopTest2026!`,
  seeded with the `quorum` role so both panels are visible unlocked) if a
  future session has dev-server permission and wants to close this gap.
  Given the retrofit is a mechanical, confirmed byte-for-byte CSS
  translation of already-shipped, already-approved treatment (community/
  leadership) plus the one new, now-approved hue (admin), and given this
  session does **not** deploy anything, the compiled-CSS verification
  above stands in for it for now.

## Standing rule (08-11, per `docs/continuity/NEXT.md`)

Nothing in this session deploys to production — only local build/CSS
verification. Sessions 09-11 (Admin/Console/Portal rollout) can now import
real `Glass`/`admin-tint`/`LiveDot` instead of re-deriving CSS, but the
"explicit visual sign-off (screenshot/artifact) before deploy" rule still
applies to whichever of them ships first. The screenshot gap noted above
should be closed before that session's own deploy, not before this one's
local commit.

## Left open

- `apps/console/.../communities/[id]/chat/chat-panel.tsx` (`ChatPanel`) is
  confirmed dead code — nothing imports it, and it predates the space-tint
  pattern entirely (never used the retrofitted classes). Out of scope for
  this session; flagged separately for deletion.
- A real logged-in screenshot of the retrofitted chat page (see above).
