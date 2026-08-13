import * as React from "react"

import { cn } from "../lib/utils"

/**
 * Glass — base panel primitive, DESIGN.web.md "Space-tint" + the original
 * Signal Pulse glass-panel language. Session `web-08-space-tint-addendum.md`:
 * first real `packages/ui` component for a look the community chat page
 * (`apps/console/.../communities/[id]/chat/`) shipped ad hoc as one-off CSS
 * (`.community-shade`, `.leadership-glow` in `apps/console/src/app/
 * globals.css`) before this component existed. That CSS is the reference
 * implementation this was extracted from — same visual result, now a real
 * import instead of copy-pasted classes.
 *
 * `space` is a narrow, third colour signal (who a panel belongs to) that
 * only ever touches this component's own background/border chrome — see
 * DESIGN.web.md for the full rule and why it can't collide with tier
 * colour or the brand accent. Undefined = plain glass panel, unchanged
 * from what every other panel in the app already uses.
 */

export type GlassSpace = "community" | "leadership" | "admin"

const TINT_HUE: Record<Exclude<GlassSpace, "community">, string> = {
  leadership: "var(--accent-end)",
  admin: "var(--admin-tint)",
}

export interface GlassProps extends React.ComponentProps<"div"> {
  space?: GlassSpace
}

function Glass({ space, className, children, ...props }: GlassProps) {
  if (space === "leadership" || space === "admin") {
    const hue = TINT_HUE[space]
    return (
      <div
        data-slot="glass"
        data-space={space}
        // Layout classes (flex-1, overflow-hidden, ...) need to land on
        // both this sizing wrapper and the inner visual panel below — the
        // 1px gradient-border padding on this div means it participates
        // in the parent flex row's sizing too, same as the original
        // `.leadership-glow` + inner-div pair it replaces.
        //
        // The 1px reveal is set via inline `style.padding`, not a `p-px`
        // class, on purpose: callers routinely pass their own padding
        // utility in `className` (e.g. DataTable's `p-0`), and `cn()`
        // (twMerge) would otherwise treat that as the same class-group as
        // a `p-px` here and silently drop the border reveal — confirmed
        // happening with DataTable before this fix. Inline style always
        // wins over a class in the same box, so the reveal can't be
        // clobbered by an unrelated caller className.
        className={cn("rounded-[calc(var(--radius-panel)+1px)]", className)}
        style={{
          padding: "1px",
          background: `linear-gradient(180deg, color-mix(in srgb, ${hue} 32%, transparent), color-mix(in srgb, ${hue} 6%, transparent))`,
          boxShadow: `0 0 20px color-mix(in srgb, ${hue} 6%, transparent)`,
        }}
      >
        <div
          className={cn(
            "rounded-panel bg-surface backdrop-blur-[var(--blur-glass)]",
            className
          )}
          {...props}
        >
          {children}
        </div>
      </div>
    )
  }

  return (
    <div
      data-slot="glass"
      data-space={space}
      className={cn(
        "rounded-panel border border-surface-border backdrop-blur-[var(--blur-glass)]",
        space === "community" ? "bg-[#e9eaee] dark:bg-[#17171b]" : "bg-surface",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { Glass }
