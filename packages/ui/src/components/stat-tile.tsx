import * as React from "react"

import { cn } from "../lib/utils"
import { Glass, type GlassSpace } from "./glass"
import { LiveDot } from "./live-dot"

/**
 * StatTile — dashboard metric tile, session 3 inventory ("StatTile |
 * shadcn Card (metric use) | Dashboard"), built for real in session
 * `web-10-console-rollout.md`. Value uses the Data-lg type spec
 * (DESIGN.web.md "Typography": JetBrains Mono, 22px, weight 700, tabular
 * figures) — admin's dashboard stat tiles (session 09) used the same raw
 * classes inline before this component existed; this formalises the
 * pattern as a real shared import.
 *
 * `live` must only ever reflect a genuine Supabase Realtime subscription
 * on the value shown — per DESIGN.web.md's Motion rule, LiveDot is never
 * decorative. Callers are responsible for verifying a real subscription
 * exists before passing `live`.
 */

export interface StatTileProps extends React.ComponentProps<"div"> {
  label: string
  value: React.ReactNode
  live?: boolean
  space?: GlassSpace
  /** Semantic override for the value's colour only (e.g. `text-success`/
   * `text-warning`/`text-error`) — reuses the same 4-value semantic
   * palette StatusChip is deliberately constrained to, never a new hue.
   * Label stays `text-secondary` regardless. */
  valueClassName?: string
}

function StatTile({
  label,
  value,
  live = false,
  space,
  className,
  valueClassName,
  ...props
}: StatTileProps) {
  return (
    <Glass space={space} className={cn("p-4", className)} {...props}>
      <div className="flex items-center gap-1.5">
        {live && <LiveDot />}
        <p className="text-caption text-text-secondary">{label}</p>
      </div>
      <p
        className={cn(
          "mt-1 font-mono text-data-lg font-bold tabular-nums text-text-primary",
          valueClassName
        )}
      >
        {value}
      </p>
    </Glass>
  )
}

export { StatTile }
