import * as React from "react"

import { cn } from "../lib/utils"

/**
 * BadgeHero — session 3 inventory ("BadgeHero | ad hoc — wraps unmodified
 * power-tree | Public conversion"), built for real in session
 * `web-11-portal-rollout.md`.
 *
 * Wraps chrome ONLY around the badge/power-tree SVG — the SVG itself
 * (`generateTreeSVG()`, `apps/portal/src/lib/power-tree.ts`) is a hard
 * constraint carried since session 2: not redesigned, not touched. This
 * component takes the already-generated SVG markup as a string and
 * injects it via the same `dangerouslySetInnerHTML` mechanism the page
 * always used — it does not regenerate or reinterpret the SVG.
 *
 * This is the one surface shared completely out of app context onto a
 * stranger's timeline (badge links) — must hold at 375px, no desktop-only
 * assumptions.
 */

export interface BadgeHeroProps extends React.ComponentProps<"div"> {
  eyebrow: string
  heading: string
  description: string
  /** Pre-generated SVG markup from `generateTreeSVG()` — passed through
   * unmodified, this component only supplies the surrounding glow/frame. */
  treeSvgHtml: string
  /** Tier glow colour (`stats.tierGlow`) — same box-shadow treatment the
   * page always used, not a new colour decision. */
  glow: string
}

function BadgeHero({
  eyebrow,
  heading,
  description,
  treeSvgHtml,
  glow,
  className,
  ...props
}: BadgeHeroProps) {
  return (
    <div className={cn("flex w-full flex-col items-center px-4", className)} {...props}>
      <div className="mb-8 max-w-lg text-center">
        <p className="text-caption font-medium uppercase tracking-widest text-primary">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-h2 font-bold text-text-primary">{heading}</h2>
        <p className="mt-2 text-body text-text-secondary">{description}</p>
      </div>
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl"
        style={{ boxShadow: `0 0 80px ${glow}, 0 0 30px ${glow}` }}
        dangerouslySetInnerHTML={{ __html: treeSvgHtml }}
      />
    </div>
  )
}

export { BadgeHero }
