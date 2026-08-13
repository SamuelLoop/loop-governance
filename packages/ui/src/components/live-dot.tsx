import * as React from "react"

import { cn } from "../lib/utils"

/**
 * LiveDot — small pulsing status dot, DESIGN.web.md "Motion". Extracted
 * from `apps/console/src/app/globals.css`'s `.live-dot` (session
 * `web-08-space-tint-addendum.md`) so it's a real import instead of
 * copy-pasted CSS. Same visual result: 1.6s ease-in-out pulse,
 * `prefers-reduced-motion`-gated.
 *
 * Only ever render this for a genuinely live Realtime subscription, never
 * decoratively — see DESIGN.web.md "Motion".
 */

function LiveDot({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="live-dot"
      aria-hidden="true"
      className={cn(
        "inline-block h-[6px] w-[6px] shrink-0 rounded-full bg-success shadow-[0_0_6px_color-mix(in_srgb,var(--success)_70%,transparent)] animate-[live-pulse_var(--duration-live-dot)_var(--ease-live)_infinite] motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  )
}

export { LiveDot }
