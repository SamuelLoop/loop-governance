import * as React from "react"

import { cn } from "../lib/utils"

/**
 * PortalNavShell — session 3 inventory ("PortalNav / StatStrip | none —
 * portal has zero shared components today | Public conversion"), built
 * for real in session `web-11-portal-rollout.md`.
 *
 * Presentational only, same rule as `DataTable`/`VoteActionPanel`: the
 * real nav (`apps/portal/src/app/portal-nav.tsx`) does the actual user
 * lookup (`getUser()`) and renders its own `NavLinks`, passed in as
 * `children`. This shell owns only the sticky/blur chrome and the logo
 * slot. The real Loop_cmbntr logo/wordmark is a brand asset this session
 * does not touch — callers must supply it via `logo`, not a default,
 * so nothing here can silently reintroduce the unauthorized-logo-swap
 * mistake from session 7's revert.
 */

export interface PortalNavShellProps extends React.ComponentProps<"nav"> {
  logo: React.ReactNode
}

function PortalNavShell({ logo, children, className, ...props }: PortalNavShellProps) {
  return (
    <nav
      className={cn(
        "sticky top-0 z-50 border-b border-surface-border bg-background/80 px-6 py-3 backdrop-blur-md",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between">
        {logo}
        {children}
      </div>
    </nav>
  )
}

export { PortalNavShell }
