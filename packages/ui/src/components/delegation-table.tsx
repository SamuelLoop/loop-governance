import * as React from "react"

import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
} from "./data-table"
import { StatusChip } from "./status-chip"

/**
 * DelegationTable — session 3 inventory ("DelegationTable | shadcn Table
 * | Delegation"), built for real in session `web-10-console-rollout.md`.
 * Shared shape for both "power you have given" and "power given to you"
 * (`apps/console/.../give-power/page.tsx`) — same 4 columns, only the
 * counterparty label and the presence of a revoke action differ, so this
 * takes both as props rather than being two near-duplicate tables.
 *
 * `renderAction` stays a callback, not a fixed "Revoke" button, the same
 * reason `DataTable` doesn't own filter/sort logic: the actual
 * `RevokeButton` is wired to a page-owned server action
 * (`delegations/actions.ts`) and only applies to the "given" table, not
 * "received".
 */

export interface DelegationRow {
  id: string
  subjectTag: string
  communityName: string
  counterpartyName: string
  createdAt: string
}

export interface DelegationTableProps {
  rows: DelegationRow[]
  /** e.g. "delegated to" or "from" */
  counterpartyLabel: string
  emptyMessage: string
  renderAction?: (row: DelegationRow) => React.ReactNode
}

function DelegationTable({
  rows,
  counterpartyLabel,
  emptyMessage,
  renderAction,
}: DelegationTableProps) {
  if (rows.length === 0) {
    return <p className="text-body text-text-secondary">{emptyMessage}</p>
  }

  return (
    <DataTable>
      <DataTableHeader>
        <tr>
          <DataTableHead>Subject</DataTableHead>
          <DataTableHead>Community</DataTableHead>
          <DataTableHead>{counterpartyLabel === "from" ? "From" : "To"}</DataTableHead>
          <DataTableHead>Since</DataTableHead>
          {renderAction && <DataTableHead align="right">Action</DataTableHead>}
        </tr>
      </DataTableHeader>
      <DataTableBody>
        {rows.map((r) => (
          <DataTableRow key={r.id}>
            <DataTableCell>
              <StatusChip variant="neutral">{r.subjectTag}</StatusChip>
            </DataTableCell>
            <DataTableCell className="text-text-secondary">{r.communityName}</DataTableCell>
            <DataTableCell className="text-text-primary">{r.counterpartyName}</DataTableCell>
            <DataTableCell className="text-caption text-text-secondary">
              {new Date(r.createdAt).toLocaleDateString()}
            </DataTableCell>
            {renderAction && (
              <DataTableCell align="right">{renderAction(r)}</DataTableCell>
            )}
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  )
}

export { DelegationTable }
