"use client";

import { useState, useActionState } from "react";
import { upsertAllocation, deleteAllocation } from "./actions";

type Allocation = {
  id: string;
  white_label_id: string;
  subject: string;
  allocation_pct: number;
  proposal_cap_cents: number | null;
  updated_by: string;
  updated_at: string;
};

type Org = { id: string; name: string };

export function AllocationsEditor({
  allocations,
  orgs,
  subjects,
  isPlatformAdmin,
  defaultOrgId,
  canEdit,
}: {
  allocations: Allocation[];
  orgs: Org[];
  subjects: string[];
  isPlatformAdmin: boolean;
  defaultOrgId: string | null;
  canEdit: boolean;
}) {
  const [selectedOrg, setSelectedOrg] = useState(defaultOrgId ?? orgs[0]?.id ?? "");
  const [editSubject, setEditSubject] = useState("");
  const [editPct, setEditPct] = useState("");
  const [editCap, setEditCap] = useState("");

  const [upsertState, upsertAction] = useActionState(upsertAllocation, { error: "" });
  const [deleteState, deleteAction] = useActionState(deleteAllocation, { error: "" });

  const orgAllocations = allocations.filter((a) => a.white_label_id === selectedOrg);
  const totalPct = orgAllocations.reduce((s, a) => s + Number(a.allocation_pct), 0);
  const usedSubjects = orgAllocations.map((a) => a.subject);
  const availableSubjects = subjects.filter((s) => !usedSubjects.includes(s));

  function startAdd() {
    setEditSubject(availableSubjects[0] ?? "");
    setEditPct("");
    setEditCap("");
  }

  return (
    <div>
      {isPlatformAdmin && orgs.length > 1 && (
        <div className="mb-4">
          <label className="text-sm font-medium">Organization</label>
          <select
            value={selectedOrg}
            onChange={(e) => setSelectedOrg(e.target.value)}
            className="mt-1 flex h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="mb-4 flex items-center gap-4">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Total Allocated</p>
          <p className={`text-xl font-bold tabular-nums ${
            totalPct === 100
              ? "text-green-400"
              : totalPct > 100
                ? "text-destructive"
                : "text-amber-400"
          }`}>
            {totalPct}%
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Subjects</p>
          <p className="text-xl font-bold tabular-nums">{orgAllocations.length}</p>
        </div>
        {totalPct !== 100 && (
          <p className="text-sm text-amber-400">
            {totalPct < 100
              ? `${(100 - totalPct).toFixed(1)}% unallocated`
              : `${(totalPct - 100).toFixed(1)}% over-allocated`}
          </p>
        )}
      </div>

      {(upsertState.error || deleteState.error) && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          {upsertState.error || deleteState.error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Subject</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Allocation %</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Proposal Cap</th>
              <th className="hidden px-4 py-2.5 text-left font-medium text-muted-foreground md:table-cell">Updated</th>
              {canEdit && (
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {orgAllocations.map((a) => (
              <tr key={a.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                <td className="px-4 py-3 font-medium capitalize">{a.subject}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  <div className="flex items-center justify-end gap-2">
                    <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-secondary md:block">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min(Number(a.allocation_pct), 100)}%` }}
                      />
                    </div>
                    {Number(a.allocation_pct)}%
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {a.proposal_cap_cents != null
                    ? `$${(a.proposal_cap_cents / 100).toLocaleString()}`
                    : <span className="text-muted-foreground">None</span>}
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <span className="text-xs text-muted-foreground">
                    {new Date(a.updated_at).toLocaleDateString()}
                  </span>
                </td>
                {canEdit && (
                  <td className="px-4 py-3 text-right">
                    <form action={deleteAction} className="inline">
                      <input type="hidden" name="id" value={a.id} />
                      <button
                        type="submit"
                        className="rounded-md px-2 py-1 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        Remove
                      </button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
            {orgAllocations.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 5 : 4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No allocations configured for this organization
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {canEdit && availableSubjects.length > 0 && (
        <div className="mt-4 rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Add Allocation</h3>
          <form action={upsertAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <input type="hidden" name="white_label_id" value={selectedOrg} />
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Subject</label>
              <select
                name="subject"
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {availableSubjects.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Allocation %</label>
              <input
                name="allocation_pct"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={editPct}
                onChange={(e) => setEditPct(e.target.value)}
                placeholder="25"
                required
                className="flex h-9 w-24 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Proposal Cap ($)</label>
              <input
                name="proposal_cap_cents"
                type="number"
                min="0"
                step="100"
                value={editCap}
                onChange={(e) => setEditCap(e.target.value)}
                placeholder="5000"
                className="flex h-9 w-28 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Add
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
