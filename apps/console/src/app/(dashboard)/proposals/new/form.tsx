"use client";

import { useActionState } from "react";
import { createProposal } from "./actions";

type Community = { id: string; name: string; slug: string; level: string };

export function CreateProposalForm({
  communities,
  userId,
}: {
  communities: Community[];
  userId: string;
}) {
  const [state, formAction] = useActionState(createProposal, { error: "" });

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          {state.error}
        </div>
      )}

      <input type="hidden" name="userId" value={userId} />

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-400">
          Community
        </label>
        <select
          name="communityId"
          required
          className="w-full rounded-md border border-neutral-700 bg-neutral-800/50 px-4 py-2.5 text-neutral-100 outline-none transition focus:border-amber-500/50"
        >
          {communities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.level})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-400">
          Title
        </label>
        <input
          name="title"
          type="text"
          required
          className="w-full rounded-md border border-neutral-700 bg-neutral-800/50 px-4 py-2.5 text-neutral-100 placeholder-neutral-500 outline-none transition focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
          placeholder="What are you proposing?"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-400">
          Description
        </label>
        <textarea
          name="description"
          required
          rows={6}
          className="w-full rounded-md border border-neutral-700 bg-neutral-800/50 px-4 py-2.5 text-neutral-100 placeholder-neutral-500 outline-none transition focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
          placeholder="Describe your proposal in detail. What problem does it solve? What are the expected outcomes?"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-400">
          Budget request (USD)
          <span className="ml-1 normal-case text-neutral-600">(optional)</span>
        </label>
        <input
          name="budget"
          type="number"
          step="0.01"
          min="0"
          className="w-full rounded-md border border-neutral-700 bg-neutral-800/50 px-4 py-2.5 text-neutral-100 placeholder-neutral-500 outline-none transition focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
          placeholder="0.00"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-400">
          Consequence
          <span className="ml-1 normal-case text-neutral-600">(what happens if approved)</span>
        </label>
        <textarea
          name="consequence"
          rows={3}
          className="w-full rounded-md border border-neutral-700 bg-neutral-800/50 px-4 py-2.5 text-neutral-100 placeholder-neutral-500 outline-none transition focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
          placeholder="What will change as a result of this proposal?"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          name="action"
          value="open"
          className="rounded-md bg-amber-600 px-6 py-2.5 font-medium text-white transition hover:bg-amber-500"
        >
          Submit and open for voting
        </button>
        <button
          type="submit"
          name="action"
          value="draft"
          className="rounded-md border border-neutral-700 px-6 py-2.5 text-sm text-neutral-300 transition hover:border-neutral-500"
        >
          Save as draft
        </button>
      </div>
    </form>
  );
}
