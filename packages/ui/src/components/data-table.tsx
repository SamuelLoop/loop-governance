import * as React from "react"

import { cn } from "../lib/utils"
import { Glass, type GlassSpace } from "./glass"

/**
 * DataTable — denser table variant for table-heavy pages (audit,
 * moderation, communities, members, treasury in admin; treasury,
 * earnings, token-activity in console), per session 3's inventory
 * ("DataTable | shadcn Table (denser variant) | Admin") — built for real
 * in session `web-09-admin-rollout.md`, extended to console in session
 * `web-10-console-rollout.md`.
 *
 * Not a data-fetching/sorting abstraction — every page that uses this has
 * real, page-specific filter/search/expand-row logic already wired to
 * server actions, so this stays a thin presentational compound component
 * (same shape as shadcn's own Table split, just denser padding/type and
 * wrapped in `Glass` instead of a plain bordered div). Pages keep their
 * own `<table>`/`<tr>`/`<td>` markup, just swap the tag for the matching
 * `DataTable*` piece.
 *
 * `space` defaults to **undefined** (plain, untinted Glass) — session 09
 * hardcoded `space="admin"` here, which was correct only because that
 * session's every call site lived inside `apps/admin` ("the whole app IS
 * the admin space"). That assumption breaks the instant this component is
 * reused in console (session 10), where most tables are general-audience
 * and only a genuinely role-gated one (e.g. token-activity's admin-only
 * purchases table) should pass `space="admin"` explicitly — tinting every
 * table by default would silently violate the space-tint rule ("tinting
 * a general-audience panel defeats the point"). Admin's own call sites
 * must now pass `space="admin"` explicitly too — see LESSONS.md for the
 * regression this would otherwise have reintroduced.
 *
 * Density: px-3 py-2 (vs shadcn Table's default px-2 py-2 in a taller
 * row) and `text-caption` headers — matches DESIGN.web.md's "console/admin
 * comfortable-dense" spacing call for a daily-use ops tool.
 */

function DataTable({
  className,
  wrapperClassName,
  space,
  ...props
}: React.ComponentProps<"table"> & {
  wrapperClassName?: string
  space?: GlassSpace
}) {
  return (
    <Glass
      space={space}
      className={cn("overflow-hidden p-0", wrapperClassName)}
    >
      <div className="overflow-x-auto">
        <table
          data-slot="data-table"
          className={cn("w-full text-body", className)}
          {...props}
        />
      </div>
    </Glass>
  )
}

function DataTableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="data-table-header"
      className={cn("border-b border-surface-border bg-surface/60", className)}
      {...props}
    />
  )
}

function DataTableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="data-table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function DataTableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="data-table-row"
      className={cn(
        "border-b border-surface-border transition-colors hover:bg-surface/70",
        className
      )}
      {...props}
    />
  )
}

function DataTableHead({
  className,
  align = "left",
  ...props
}: React.ComponentProps<"th"> & { align?: "left" | "right" }) {
  return (
    <th
      data-slot="data-table-head"
      className={cn(
        "whitespace-nowrap px-3 py-2 text-caption font-medium text-text-secondary",
        align === "right" ? "text-right" : "text-left",
        className
      )}
      {...props}
    />
  )
}

function DataTableCell({
  className,
  align = "left",
  numeric = false,
  ...props
}: React.ComponentProps<"td"> & { align?: "left" | "right"; numeric?: boolean }) {
  return (
    <td
      data-slot="data-table-cell"
      className={cn(
        "px-3 py-2 text-body",
        numeric && "font-mono tabular-nums",
        align === "right" ? "text-right" : "text-left",
        className
      )}
      {...props}
    />
  )
}

function DataTableEmpty({
  colSpan,
  children,
}: {
  colSpan: number
  children: React.ReactNode
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-8 text-center text-body text-text-muted">
        {children}
      </td>
    </tr>
  )
}

export {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
  DataTableEmpty,
}
