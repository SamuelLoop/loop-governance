"use client";

import { Fragment, useState } from "react";
import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
  DataTableEmpty,
  StatusChip,
  type StatusChipVariant,
} from "@loop/ui";

type AuditEvent = {
  id: string;
  actor_name: string | null;
  event_type: string;
  target_type: string;
  target_id: string;
  detail: Record<string, unknown> | null;
  created_at: string;
  org_name: string | null;
};

// See packages/ui/src/components/status-chip.tsx: only the semantic
// palette (success/warning/error/neutral) is available, so categories
// that aren't a severity signal map to "neutral" — the event_type label
// text itself still carries the specific category.
const EVENT_CATEGORY_VARIANT: Record<string, StatusChipVariant> = {
  role: "warning",
  treasury: "warning",
  moderation: "neutral",
  settings: "neutral",
};

function categoryOf(eventType: string): string {
  return eventType.split(".")[0] ?? "other";
}

export function AuditTable({ events, showOrg }: { events: AuditEvent[]; showOrg: boolean }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories = ["all", ...new Set(events.map((e) => categoryOf(e.event_type)))];

  const filtered = events.filter((e) => {
    if (category !== "all" && categoryOf(e.event_type) !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        e.event_type.toLowerCase().includes(q) ||
        (e.actor_name ?? "").toLowerCase().includes(q) ||
        e.target_id.toLowerCase().includes(q) ||
        JSON.stringify(e.detail ?? {}).toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events, actors, targets..."
          className="flex h-9 w-full max-w-sm rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-md px-3 py-1.5 text-xs capitalize transition-colors ${
                category === c
                  ? "bg-primary text-primary-foreground"
                  : "border border-surface-border bg-surface text-text-secondary hover:text-text-primary"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <DataTable>
        <DataTableHeader>
          <tr>
            <DataTableHead>Time</DataTableHead>
            <DataTableHead>Event</DataTableHead>
            <DataTableHead>Actor</DataTableHead>
            {showOrg && <DataTableHead className="hidden md:table-cell">Org</DataTableHead>}
            <DataTableHead className="hidden lg:table-cell">Target</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {filtered.map((e) => {
            const cat = categoryOf(e.event_type);
            const isExpanded = expandedId === e.id;
            return (
              <Fragment key={e.id}>
                <DataTableRow
                  onClick={() => setExpandedId(isExpanded ? null : e.id)}
                  className="cursor-pointer"
                >
                  <DataTableCell numeric className="whitespace-nowrap text-caption text-text-secondary">
                    {new Date(e.created_at).toLocaleString()}
                  </DataTableCell>
                  <DataTableCell>
                    <StatusChip variant={EVENT_CATEGORY_VARIANT[cat] ?? "neutral"}>
                      {e.event_type}
                    </StatusChip>
                  </DataTableCell>
                  <DataTableCell>{e.actor_name ?? "Unknown"}</DataTableCell>
                  {showOrg && (
                    <DataTableCell className="hidden text-text-secondary md:table-cell">
                      {e.org_name ?? "—"}
                    </DataTableCell>
                  )}
                  <DataTableCell className="hidden lg:table-cell">
                    <span className="text-caption text-text-secondary">
                      {e.target_type} · {e.target_id.slice(0, 8)}…
                    </span>
                  </DataTableCell>
                </DataTableRow>
                {isExpanded && (
                  <DataTableRow className="bg-surface/40 hover:bg-surface/40">
                    <DataTableCell colSpan={showOrg ? 5 : 4}>
                      <pre className="overflow-x-auto rounded-md bg-background p-3 text-caption text-text-secondary">
                        {JSON.stringify(e.detail ?? {}, null, 2)}
                      </pre>
                    </DataTableCell>
                  </DataTableRow>
                )}
              </Fragment>
            );
          })}
          {filtered.length === 0 && (
            <DataTableEmpty colSpan={showOrg ? 5 : 4}>No audit events found</DataTableEmpty>
          )}
        </DataTableBody>
      </DataTable>
    </div>
  );
}
