import * as React from "react"

import { cn } from "../lib/utils"

/**
 * ConversionCard — session 3 inventory ("ConversionCard | shadcn Card
 * (light variant) | Public conversion"), built for real in session
 * `web-11-portal-rollout.md`. Used on `buy`, `buy/success`, `create`,
 * `join/[slug]` — the pages with real Stripe checkout / conversion
 * stakes.
 *
 * Deliberately NOT `Glass` here: `Glass`'s translucency + blur is a
 * structural/decorative signal, and the brief calls this out explicitly
 * ("don't sacrifice form/checkout clarity for glass-panel styling").
 * `ConversionCard` uses `--popover` (already opaque in `theme.css`,
 * `#141414`), no backdrop-filter — a solid, legible surface for text
 * inputs and payment fields, prioritising clarity over the frosted look
 * everything else in the design system uses.
 */

function ConversionCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-panel border border-surface-border bg-popover p-6 sm:p-8",
        className
      )}
      {...props}
    />
  )
}

export { ConversionCard }
