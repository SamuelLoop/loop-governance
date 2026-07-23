"use client";

import { Fragment, useState } from "react";

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

const EVENT_CATEGORY_STYLES: Record<string, string> = {
  role: "border-red-500/40 bg-red-500/15 text-red-400",
  treasury: "border-amber-500/40 bg-amber-500/15 text-amber-400",
  moderation: "border-blue-500/40 bg-blue-500/15 text-blue-400",
  settings: "border-purple-500/40 bg-purple-500/15 text-purple-400",
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
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Time</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Event</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Actor</th>
              {showOrg && (
                <th className="hidden px-4 py-2.5 text-left font-medium text-muted-foreground md:table-cell">Org</th>
              )}
              <th className="hidden px-4 py-2.5 text-left font-medium text-muted-foreground lg:table-cell">Target</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => {
              const cat = categoryOf(e.event_type);
              const isExpanded = expandedId === e.id;
              return (
                <Fragment key={e.id}>
                  <tr
                    onClick={() => setExpandedId(isExpanded ? null : e.id)}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-secondary/20"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                        EVENT_CATEGORY_STYLES[cat] ?? "border-border bg-secondary/50 text-muted-foreground"
                      }`}>
                        {e.event_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">{e.actor_name ?? "Unknown"}</td>
                    {showOrg && (
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {e.org_name ?? "—"}
                      </td>
                    )}
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {e.target_type} · {e.target_id.slice(0, 8)}…
                      </span>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="border-b border-border last:border-0 bg-secondary/10">
                      <td colSpan={showOrg ? 5 : 4} className="px-4 py-3">
                        <pre className="overflow-x-auto rounded-md bg-background p-3 text-xs text-muted-foreground">
                          {JSON.stringify(e.detail ?? {}, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={showOrg ? 5 : 4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No audit events found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
