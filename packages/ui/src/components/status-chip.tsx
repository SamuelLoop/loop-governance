import * as React from "react"

import { cn } from "../lib/utils"

/**
 * StatusChip — semantic-colour-only status indicator, per session 3's
 * inventory ("StatusChip | ad hoc — semantic colour only | Admin") and
 * `sessions/web-09-admin-rollout.md`: "Table rows/detail panels that
 * represent a specific destructive or high-stakes action ... are the one
 * place to consider an additional StatusChip (semantic-colour only, not
 * space-tint)".
 *
 * Deliberately constrained to the 4 variants DESIGN.web.md actually
 * defines a hue for (success/warning/error + a neutral/bordered default) —
 * NOT a general-purpose categorical-colour badge. Several admin tables
 * pre-dated this component with ad hoc per-category hues (blue for
 * "moderation", purple for "settings", a second blue for "org_manager",
 * etc.) that don't correspond to any severity/status meaning and aren't
 * part of the locked palette (DESIGN.web.md: brand blue-violet gradient =
 * action only, tier colours = status only, no invented second saturated
 * hue). Those categorical distinctions now render as `neutral` chips —
 * differentiated by their label text, same as every other admin list
 * column that has no colour at all — rather than resurrecting hues the
 * design system doesn't own. `warning` doubles as "high-stakes, pay
 * attention" (privilege escalation, treasury movement, locked cascade
 * values) even where the underlying event isn't literally an error.
 */

export type StatusChipVariant = "success" | "warning" | "error" | "neutral"

const VARIANT_STYLES: Record<StatusChipVariant, string> = {
  success: "border-success/40 bg-success/15 text-success",
  warning: "border-warning/40 bg-warning/15 text-warning",
  error: "border-error/40 bg-error/15 text-error",
  neutral: "border-surface-border bg-surface text-text-secondary",
}

export interface StatusChipProps extends React.ComponentProps<"span"> {
  variant?: StatusChipVariant
}

function StatusChip({
  variant = "neutral",
  className,
  children,
  ...props
}: StatusChipProps) {
  return (
    <span
      data-slot="status-chip"
      data-variant={variant}
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-pill border px-2 py-0.5 text-data-sm font-medium capitalize",
        VARIANT_STYLES[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export { StatusChip }
