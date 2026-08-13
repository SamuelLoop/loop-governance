import * as React from "react"

import { cn } from "../lib/utils"

/**
 * StatStrip — session 3 inventory ("PortalNav / StatStrip | none —
 * portal has zero shared components today | Public conversion"), built
 * for real in session `web-11-portal-rollout.md`. Formalises the "live
 * stats bar" pattern (participants / communities / proposals / subjects,
 * `apps/portal/src/app/page.tsx`'s hero) as a shared component instead
 * of one-off markup, so join/create can reuse the same treatment for
 * their own counts without re-deriving the layout.
 */

export interface StatStripItem {
  label: string
  value: React.ReactNode
}

export interface StatStripProps extends React.ComponentProps<"div"> {
  items: StatStripItem[]
}

function StatStrip({ items, className, ...props }: StatStripProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap justify-center gap-10 text-center text-caption text-text-secondary",
        className
      )}
      {...props}
    >
      {items.map((item) => (
        <div key={item.label}>
          <span className="block font-mono text-display font-light text-text-primary">
            {item.value}
          </span>
          {item.label}
        </div>
      ))}
    </div>
  )
}

export { StatStrip }
