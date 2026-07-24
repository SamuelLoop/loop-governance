"use client";

import { useActionState, useState, useTransition } from "react";
import { createDelegation, getOverlappingCommunities } from "./actions";
import type { OverlappingCommunity } from "./actions";

type Member = { id: string; display_name: string };

const LEVEL_LABELS: Record<string, string> = {
  global: "Global",
  continental: "Continental",
  national: "National",
  city: "City",
  local: "Local",
};

export function DelegateForm({
  giverId,
  members,
  activeSubject,
}: {
  giverId: string;
  members: Member[];
  activeSubject: string;
}) {
  const [state, formAction] = useActionState(createDelegation, {
    error: "",
    success: false,
  });
  const [selectedDelegate, setSelectedDelegate] = useState("");
  const [overlapping, setOverlapping] = useState<OverlappingCommunity[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [allSelected, setAllSelected] = useState(true);
  const [loading, startTransition] = useTransition();

  function handleDelegateChange(delegateId: string) {
    setSelectedDelegate(delegateId);
    setSelectedIds(new Set());
    setAllSelected(true);

    if (!delegateId) {
      setOverlapping([]);
      return;
    }

    startTransition(async () => {
      const communities = await getOverlappingCommunities(
        giverId,
        delegateId,
        activeSubject
      );
      setOverlapping(communities);
      setSelectedIds(new Set(communities.map((c) => c.id)));
      setAllSelected(true);
    });
  }

  function toggleAll() {
    if (allSelected) {
      setAllSelected(false);
      setSelectedIds(new Set());
    } else {
      setAllSelected(true);
      setSelectedIds(new Set(overlapping.map((c) => c.id)));
    }
  }

  function toggleCommunity(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
    setAllSelected(next.size === overlapping.length);
  }

  const communityIdsForSubmit = JSON.stringify([...selectedIds]);

  return (
    <div className="space-y-4">
      {state.error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="rounded-md border border-green-500/30 bg-green-500/10 px-4 py-2.5 text-sm text-green-400">
          Delegation created. Your vote on this subject now goes through your
          delegate.
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-400">
          Who do you trust with your power?
        </label>
        <select
          value={selectedDelegate}
          onChange={(e) => handleDelegateChange(e.target.value)}
          className="w-full rounded-md border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-amber-500/50"
        >
          <option value="">Select a person</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.display_name}
            </option>
          ))}
        </select>
      </div>

      {selectedDelegate && loading && (
        <p className="text-xs text-muted-foreground">
          Finding shared communities...
        </p>
      )}

      {selectedDelegate && !loading && overlapping.length === 0 && (
        <p className="text-sm text-muted-foreground">
          You and this person do not share any communities in this subject.
          You can only delegate power in communities you both belong to.
        </p>
      )}

      {selectedDelegate && !loading && overlapping.length > 0 && (
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-400">
            Which communities?
          </label>
          <p className="mb-2 text-xs text-muted-foreground">
            Select the communities where this person will vote on your behalf.
            You can only delegate in communities you both belong to.
          </p>
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-neutral-700 bg-neutral-800/30 p-2">
            <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 transition hover:bg-neutral-700/50">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="h-3.5 w-3.5 rounded border-neutral-600 accent-amber-500"
              />
              <span className="text-sm font-medium text-neutral-100">
                All communities ({overlapping.length})
              </span>
            </label>
            <div className="my-1 border-t border-neutral-700/50" />
            {overlapping.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 transition hover:bg-neutral-700/50"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(c.id)}
                  onChange={() => toggleCommunity(c.id)}
                  className="h-3.5 w-3.5 rounded border-neutral-600 accent-amber-500"
                />
                <span className="text-sm text-neutral-200">{c.name}</span>
                <span className="rounded-full border border-neutral-600 px-1.5 py-0.5 text-[10px] text-neutral-400">
                  {LEVEL_LABELS[c.level] ?? c.level}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {selectedDelegate && !loading && overlapping.length > 0 && selectedIds.size > 0 && (
        <form action={formAction}>
          <input type="hidden" name="delegatorId" value={giverId} />
          <input type="hidden" name="delegateId" value={selectedDelegate} />
          <input type="hidden" name="communityIds" value={communityIdsForSubmit} />
          <input type="hidden" name="subjectTag" value={activeSubject} />
          <button
            type="submit"
            className="rounded-md bg-amber-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-amber-500"
          >
            Delegate vote in {selectedIds.size} communit{selectedIds.size === 1 ? "y" : "ies"}
          </button>
        </form>
      )}
    </div>
  );
}
