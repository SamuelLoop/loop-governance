"use client";

import { useActionState, useState } from "react";
import { createDelegation } from "./actions";

type Member = { id: string; display_name: string };
type Community = { id: string; name: string; subject_tags: string[] | null };

export function DelegateForm({
  giverId,
  members,
  communities,
}: {
  giverId: string;
  members: Member[];
  communities: Community[];
}) {
  const [state, formAction] = useActionState(createDelegation, {
    error: "",
    success: false,
  });
  const [selectedCommunity, setSelectedCommunity] = useState(
    communities[0]?.id ?? ""
  );

  const tags =
    communities.find((c) => c.id === selectedCommunity)?.subject_tags ?? [];

  return (
    <form action={formAction} className="space-y-4">
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

      <input type="hidden" name="delegatorId" value={giverId} />

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-400">
            Delegate to
          </label>
          <select
            name="delegateId"
            required
            className="w-full rounded-md border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-amber-500/50"
          >
            <option value="">Select a member</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.display_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-400">
            Community
          </label>
          <select
            name="communityId"
            required
            value={selectedCommunity}
            onChange={(e) => setSelectedCommunity(e.target.value)}
            className="w-full rounded-md border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-amber-500/50"
          >
            {communities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-400">
            Subject
          </label>
          <select
            name="subjectTag"
            required
            className="w-full rounded-md border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-amber-500/50"
          >
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        className="rounded-md bg-amber-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-amber-500"
      >
        Delegate vote
      </button>
    </form>
  );
}
