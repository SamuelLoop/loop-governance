import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * `cn()` — class-merge helper used everywhere in `packages/ui` and both
 * apps. Plain `twMerge(clsx(...))` (no `extend`) does NOT know this
 * repo's custom `@theme`-defined type-scale (`text-display`/`text-h1`/
 * `text-h2`/`text-body`/`text-caption`/`text-data-lg`/`text-data-sm`,
 * `theme.css` §2) or semantic/space-tint text colours (`text-success`/
 * `text-warning`/`text-error`/`text-admin-tint`/`text-text-primary`/
 * `text-text-secondary`/`text-text-muted`/tier colours) belong to
 * Tailwind's real `font-size`/`text-color` conflict groups — plain
 * `tailwind-merge` v3 falls back to a same-prefix heuristic instead,
 * which incorrectly lumps EVERY `text-*` class (size AND colour) into
 * one group. Found in session `web-10-console-rollout.md`: `cn("...
 * text-data-lg ... text-text-primary", "text-success")` (a `StatTile`
 * value colour override) silently dropped `text-data-lg` too, not just
 * `text-text-primary` — confirmed via a direct `twMerge()` call, not
 * assumed. `extendTailwindMerge` below registers both groups explicitly
 * so a colour-only override can no longer clobber a caller's font-size,
 * and a real font-size override still works. See LESSONS.md #14 for the
 * full writeup and the two `console.log` checks used to verify this
 * fix (re-run them before changing this list, don't just reason about
 * it).
 */
const cnMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        "text-display",
        "text-h1",
        "text-h2",
        "text-body",
        "text-caption",
        "text-data-lg",
        "text-data-sm",
      ],
      "text-color": [
        "text-success",
        "text-warning",
        "text-error",
        "text-admin-tint",
        "text-text-primary",
        "text-text-secondary",
        "text-text-muted",
        "text-tier-diamond",
        "text-tier-platinum",
        "text-tier-gold",
        "text-tier-silver",
        "text-tier-bronze",
        "text-tier-diamond-text",
        "text-tier-platinum-text",
        "text-tier-gold-text",
        "text-tier-silver-text",
        "text-tier-bronze-text",
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return cnMerge(clsx(inputs))
}
