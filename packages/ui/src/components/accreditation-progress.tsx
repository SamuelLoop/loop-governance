import * as React from "react"

import { cn } from "../lib/utils"

/**
 * AccreditationProgress — session 3 inventory ("AccreditationProgress |
 * ad hoc | Delegation"), built for real in session
 * `web-10-console-rollout.md`. Replaces the plain-text "X / Y votes (Z%)"
 * line on `apps/console/.../accreditation/page.tsx`'s "Power by
 * community" cards with a real progress bar toward the community's
 * leadership quorum threshold — same visual language and motion token
 * (`--duration-vote-bar`/`--ease-vote-bar`) as `VoteBar`.
 */

export interface AccreditationProgressProps extends React.ComponentProps<"div"> {
  votes: number
  totalMembers: number
  /** Quorum threshold, as a percent (0-100). */
  thresholdPct: number
  /** Already holds a quorum/admin seat in this community. */
  hasSeat: boolean
}

function AccreditationProgress({
  votes,
  totalMembers,
  thresholdPct,
  hasSeat,
  className,
  ...props
}: AccreditationProgressProps) {
  const pct = totalMembers > 0 ? (votes / totalMembers) * 100 : 0
  const met = hasSeat || pct >= thresholdPct

  return (
    <div className={cn("space-y-1.5", className)} {...props}>
      <div className="flex items-center justify-between text-caption text-text-secondary">
        <span>
          {votes} / {totalMembers} votes ({pct.toFixed(1)}%)
        </span>
        {!hasSeat && <span>need {thresholdPct}% for leadership</span>}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-[var(--duration-vote-bar)] ease-[var(--ease-vote-bar)]",
            met ? "bg-success" : "bg-primary"
          )}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}

export { AccreditationProgress }
