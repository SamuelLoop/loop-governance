import * as React from "react"

import { cn } from "../lib/utils"
import { Glass } from "./glass"

/**
 * Vote primitives — session 3 inventory ("VoteTally / VoteBar | shadcn
 * Progress | Governance", "VoteActionPanel | ad hoc buttons | Governance"),
 * built for real in session `web-10-console-rollout.md`.
 *
 * For/against uses the semantic success/error tokens, not an invented
 * data-viz hue — this is a genuine polarity signal (same discipline as
 * StatusChip), and every proposal page already used green/red for this
 * ad hoc before these components existed; this formalises the same
 * choice with theme-safe tokens instead of hardcoded Tailwind colours.
 *
 * These stay thin and presentational, same rule as `DataTable`: the
 * actual vote submission (`castVote` server action, `useActionState`,
 * existing-vote lookup) stays page-owned in each page's own
 * `vote-buttons.tsx`-style file, which renders its buttons as
 * `VoteActionPanel`'s children.
 */

export interface VoteTallyProps extends React.ComponentProps<"div"> {
  votesFor: number
  votesAgainst: number
  /** Labeled = "For: 12 / Against: 3" (proposal detail header).
   * Compact = "+12 / -3" (list rows, dashboard activity feed). */
  labeled?: boolean
}

function VoteTally({
  votesFor,
  votesAgainst,
  labeled = false,
  className,
  ...props
}: VoteTallyProps) {
  return (
    <div className={cn("flex gap-4 font-mono text-data-sm", className)} {...props}>
      <span className="text-success">{labeled ? `For: ${votesFor}` : `+${votesFor}`}</span>
      <span className="text-error">{labeled ? `Against: ${votesAgainst}` : `-${votesAgainst}`}</span>
    </div>
  )
}

export interface VoteBarProps extends React.ComponentProps<"div"> {
  votesFor: number
  votesAgainst: number
}

function VoteBar({ votesFor, votesAgainst, className, ...props }: VoteBarProps) {
  const total = votesFor + votesAgainst
  const forPct = total > 0 ? (votesFor / total) * 100 : 0
  return (
    <div
      className={cn("h-2 overflow-hidden rounded-full bg-error/30", className)}
      {...props}
    >
      <div
        className="h-full rounded-full bg-success transition-[width] duration-[var(--duration-vote-bar)] ease-[var(--ease-vote-bar)]"
        style={{ width: `${forPct}%` }}
      />
    </div>
  )
}

export interface VoteActionPanelProps extends React.ComponentProps<"div"> {
  /** Caller's already-cast choice, if any — renders the read-only
   * "You voted ..." state instead of `children` (the vote form). */
  existingChoice?: string | null
  error?: string | null
}

function VoteActionPanel({
  existingChoice,
  error,
  children,
  className,
  ...props
}: VoteActionPanelProps) {
  return (
    <Glass className={cn("p-4", className)} {...props}>
      {existingChoice ? (
        <p className="text-body text-text-secondary">
          You voted{" "}
          <span
            className={cn(
              "font-medium",
              existingChoice === "for"
                ? "text-success"
                : existingChoice === "against"
                  ? "text-error"
                  : "text-text-primary"
            )}
          >
            {existingChoice}
          </span>
        </p>
      ) : (
        <>
          {error && <p className="mb-2 text-body text-error">{error}</p>}
          <p className="mb-2 text-body text-text-secondary">Cast your vote:</p>
          {children}
        </>
      )}
    </Glass>
  )
}

export { VoteTally, VoteBar, VoteActionPanel }
