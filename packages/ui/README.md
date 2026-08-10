# @loop/ui

Shared design-system package for the Loop Governance web platform
(`apps/console`, `apps/admin`, `apps/portal`). Built session
`web-07-scaffold.md`, 2026-08-10. Design spec: `DESIGN.web.md` (repo root).
Direction: **Signal Pulse**.

## What's here

```
packages/ui/
├── theme.css              Tailwind v4 @theme tokens — SOURCE OF TRUTH for
│                          colour/type/spacing/radius/motion. Written
│                          session web-06-brand, wired in session 7.
├── fonts/                 General Sans, Geist, JetBrains Mono (self-hosted
│                          .woff2, license-verified) — loaded via
│                          next/font/local, one copy per app (see below).
├── assets/brand/          Favicons, wordmark SVGs, OG images.
└── src/
    ├── index.ts           Barrel export — everything below, re-exported.
    ├── lib/utils.ts        cn() — clsx + tailwind-merge.
    ├── hooks/use-mobile.ts
    └── components/ui/      19 base primitives (see list below).
```

**Not yet built:** the RN-safe `./power-tree` subpath export
(`types.ts` / `layout.ts` / `generate-svg.ts`, consolidating
`apps/{console,portal}/src/lib/power-tree.ts`). Scoped in
`sessions/web-eng-plan-output.md` decision 6 / task T1 but explicitly
**out of scope for the scaffold session** — the badge/power-tree component
stays untouched everywhere until that task runs on purpose. `apps/mobile`
has zero `@loop/ui` dependency today for the same reason (eng-plan T4.6,
not yet done).

## The rebind decision (read this before touching a token)

`theme.css` **rebinds** the existing shadcn CSS variable names
(`--primary`, `--card`, `--border`, …) to Signal Pulse's actual values —
it does not add a second, parallel token set. This is deliberate
(`sessions/web-eng-plan-output.md` decision 1): all 19 primitives below
already call `bg-background`, `text-foreground`, `border-border`, etc., so
rebinding those names is what lets a token change ripple through every
component with zero component-code edits. If you need a new visual concept
that doesn't map to an existing shadcn variable (glass surfaces, the tier
palette, the brand gradient), add it as a new named token in `theme.css`
rather than reaching for a raw hex in component code — see `theme.css`'s
own header comments for the existing pattern (`--surface`, `--tier-*`,
`--accent-gradient`, …).

## The 19 primitives

`avatar`, `badge`, `breadcrumb`, `button`, `card`, `dialog`,
`dropdown-menu`, `input`, `label`, `progress`, `select`, `separator`,
`sheet`, `sidebar`, `skeleton`, `table`, `tabs`, `textarea`, `tooltip`.

Consolidated from `apps/console/src/components/ui/*` (console's 19 were
byte-identical to admin's 14-item subset before this session — verified by
diff, not assumed). Portal had zero local copies; it now consumes these
directly for the first time.

**How apps/console and apps/admin consume this today:** their own local
`src/components/ui/*.tsx` files are now one-line re-export shims
(`export * from "@loop/ui"`), so none of the 58 existing call sites needed
touching. This is a deliberate scoping choice for the scaffold session —
rewriting all 58 files to import `@loop/ui` directly is eng-plan task T3.5,
tracked separately, purely mechanical cleanup with zero behavioural
difference from the shim. Do it whenever convenient; it is not blocking
anything.

**How apps/portal consumes this:** directly — `import { Button } from
"@loop/ui"` — no shim layer, since there was nothing to preserve.

## Fonts — the next/font/local contract

`theme.css` declares CSS variable *names* only (`--font-general-sans`,
`--font-geist`, `--font-jetbrains-mono`); it does not generate
`@font-face` rules. Each app's `layout.tsx` loads the actual files via
`next/font/local` and must produce variables with those exact names. See
any of the three apps' `layout.tsx` for a working example, or
`theme.css`'s own header comment.

## Dev loop

```bash
pnpm --filter console dev   # :3200
pnpm --filter admin dev     # :3300
pnpm --filter portal dev    # :3100
```

Editing `packages/ui/src/components/ui/*` or `packages/ui/theme.css`
hot-reloads all three dev servers immediately — `transpilePackages:
["@loop/ui"]` in each app's `next.config.ts` is what makes this work
without a separate build step (`packages/ui` ships raw TypeScript source,
same pattern as `packages/db`).

**`pnpm dev:web` (all three at once) is not wired yet** — tracked in
`sessions/web-devex-checklist.md` D2, not this session's scope.

## Verify

```bash
pnpm --filter @loop/ui type-check
```
