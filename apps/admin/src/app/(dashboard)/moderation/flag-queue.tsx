"use client";

import { useState, useActionState } from "react";
import { resolveFlag } from "./actions";
import { Glass, StatusChip, type StatusChipVariant } from "@loop/ui";

type Flag = {
  id: string;
  white_label_id: string;
  reporter_name: string | null;
  target_type: string;
  target_id: string;
  reason: string;
  status: string;
  resolved_by_name: string | null;
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
  org_name: string | null;
};

const STATUS_VARIANT: Record<string, StatusChipVariant> = {
  pending: "warning",
  actioned: "success",
  dismissed: "neutral",
};

export function FlagQueue({
  flags,
  canResolve,
  showOrg,
}: {
  flags: Flag[];
  canResolve: boolean;
  showOrg: boolean;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [state, formAction] = useActionState(resolveFlag, { error: "" });

  const filtered = statusFilter === "all" ? flags : flags.filter((f) => f.status === statusFilter);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {["pending", "actioned", "dismissed", "all"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-md px-3 py-1.5 text-sm capitalize transition-colors ${
              statusFilter === s
                ? "bg-primary text-primary-foreground"
                : "border border-surface-border bg-surface text-text-secondary hover:text-text-primary"
            }`}
          >
            {s}
            {s !== "all" && (
              <span className="ml-1.5 text-xs opacity-70">
                {flags.filter((f) => f.status === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {state.error && (
        <div className="mb-4 rounded-md border border-error/30 bg-error/10 px-4 py-2.5 text-sm text-error">
          {state.error}
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((f) => (
          <Glass key={f.id} space="admin" className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <StatusChip variant={STATUS_VARIANT[f.status] ?? "neutral"}>
                    {f.status}
                  </StatusChip>
                  <span className="text-caption font-medium capitalize text-text-secondary">
                    {f.target_type}
                  </span>
                  {showOrg && f.org_name && (
                    <span className="text-caption text-text-secondary">{f.org_name}</span>
                  )}
                </div>
                <p className="text-body font-medium">{f.reason}</p>
                <p className="mt-1 text-caption text-text-secondary">
                  Reported by {f.reporter_name ?? "Unknown"} on{" "}
                  {new Date(f.created_at).toLocaleString()} · Target: {f.target_id.slice(0, 8)}…
                </p>
                {f.status !== "pending" && (
                  <p className="mt-2 text-caption text-text-secondary">
                    Resolved by {f.resolved_by_name ?? "Unknown"}
                    {f.resolved_at && ` on ${new Date(f.resolved_at).toLocaleString()}`}
                    {f.resolution_note && (
                      <span className="mt-0.5 block italic">&quot;{f.resolution_note}&quot;</span>
                    )}
                  </p>
                )}
              </div>

              {canResolve && f.status === "pending" && resolvingId !== f.id && (
                <button
                  onClick={() => { setResolvingId(f.id); setNote(""); }}
                  className="rounded-md border border-surface-border px-3 py-1.5 text-sm hover:bg-secondary/50 transition-colors"
                >
                  Resolve
                </button>
              )}
            </div>

            {canResolve && resolvingId === f.id && (
              <div className="mt-3 border-t border-surface-border pt-3">
                <label className="text-xs text-text-secondary">Resolution note (optional)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Reason for the decision..."
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <div className="mt-2 flex gap-2">
                  <form action={formAction}>
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="status" value="actioned" />
                    <input type="hidden" name="resolution_note" value={note} />
                    <button
                      type="submit"
                      className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Take Action
                    </button>
                  </form>
                  <form action={formAction}>
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="status" value="dismissed" />
                    <input type="hidden" name="resolution_note" value={note} />
                    <button
                      type="submit"
                      className="rounded-md border border-surface-border px-3 py-1.5 text-sm hover:bg-secondary/50 transition-colors"
                    >
                      Dismiss
                    </button>
                  </form>
                  <button
                    onClick={() => setResolvingId(null)}
                    className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </Glass>
        ))}

        {filtered.length === 0 && (
          <Glass space="admin" className="py-12 text-center text-sm text-text-secondary">
            No {statusFilter === "all" ? "" : statusFilter + " "}flags
          </Glass>
        )}
      </div>
    </div>
  );
}
