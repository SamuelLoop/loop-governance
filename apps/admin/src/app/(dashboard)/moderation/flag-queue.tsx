"use client";

import { useState, useActionState } from "react";
import { resolveFlag } from "./actions";

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

const STATUS_STYLES: Record<string, string> = {
  pending: "border-amber-500/40 bg-amber-500/15 text-amber-400",
  actioned: "border-green-500/40 bg-green-500/15 text-green-400",
  dismissed: "border-border bg-secondary/50 text-muted-foreground",
};

const TARGET_STYLES: Record<string, string> = {
  message: "text-blue-400",
  proposal: "text-purple-400",
  user: "text-red-400",
  community: "text-amber-400",
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
                : "border border-border bg-card text-muted-foreground hover:text-foreground"
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
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((f) => (
          <div key={f.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[f.status] ?? ""}`}>
                    {f.status}
                  </span>
                  <span className={`text-xs font-medium capitalize ${TARGET_STYLES[f.target_type] ?? "text-muted-foreground"}`}>
                    {f.target_type}
                  </span>
                  {showOrg && f.org_name && (
                    <span className="text-xs text-muted-foreground">{f.org_name}</span>
                  )}
                </div>
                <p className="text-sm font-medium">{f.reason}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Reported by {f.reporter_name ?? "Unknown"} on{" "}
                  {new Date(f.created_at).toLocaleString()} · Target: {f.target_id.slice(0, 8)}…
                </p>
                {f.status !== "pending" && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Resolved by {f.resolved_by_name ?? "Unknown"}
                    {f.resolved_at && ` on ${new Date(f.resolved_at).toLocaleString()}`}
                    {f.resolution_note && (
                      <span className="mt-0.5 block italic">"{f.resolution_note}"</span>
                    )}
                  </p>
                )}
              </div>

              {canResolve && f.status === "pending" && resolvingId !== f.id && (
                <button
                  onClick={() => { setResolvingId(f.id); setNote(""); }}
                  className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-secondary/50 transition-colors"
                >
                  Resolve
                </button>
              )}
            </div>

            {canResolve && resolvingId === f.id && (
              <div className="mt-3 border-t border-border pt-3">
                <label className="text-xs text-muted-foreground">Resolution note (optional)</label>
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
                      className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-secondary/50 transition-colors"
                    >
                      Dismiss
                    </button>
                  </form>
                  <button
                    onClick={() => setResolvingId(null)}
                    className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="rounded-lg border border-border bg-card py-12 text-center text-sm text-muted-foreground">
            No {statusFilter === "all" ? "" : statusFilter + " "}flags
          </div>
        )}
      </div>
    </div>
  );
}
