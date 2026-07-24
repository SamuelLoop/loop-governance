"use client";

import { useActionState, useMemo, useState } from "react";
import { createProposal } from "./actions";

type Community = { id: string; name: string; slug: string; level: string };
type ChildRef = { id: string; name: string; level: string; parent_id: string | null };

type ProposalType = "standard" | "regional_cascade" | "treasury_distribution";

export function CreateProposalForm({
  communities,
  childrenByParent,
  userId,
}: {
  communities: Community[];
  childrenByParent: Record<string, ChildRef[]>;
  userId: string;
}) {
  const [state, formAction] = useActionState(createProposal, { error: "" });
  const [proposalType, setProposalType] = useState<ProposalType>("standard");
  const [communityId, setCommunityId] = useState(communities[0]?.id ?? "");
  const [splits, setSplits] = useState<Record<string, string>>({});

  const children = useMemo(
    () => (communityId ? childrenByParent[communityId] ?? [] : []),
    [communityId, childrenByParent]
  );
  const totalSplitPct = useMemo(
    () =>
      Object.values(splits).reduce((s, v) => {
        const n = Number(v);
        return s + (Number.isFinite(n) ? n : 0);
      }, 0),
    [splits]
  );

  const cascadeAllocationsJson = useMemo(() => {
    if (proposalType !== "regional_cascade") return "";
    const amountRaw = (document.getElementById("cascadeAmount") as HTMLInputElement | null)?.value;
    const amount = Number(amountRaw);
    return JSON.stringify({
      amount: Number.isFinite(amount) ? amount : 0,
      splits: Object.entries(splits)
        .filter(([, v]) => Number(v) > 0)
        .map(([id, v]) => ({ child_community_id: id, pct: Number(v) })),
    });
  }, [proposalType, splits]);

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          {state.error}
        </div>
      )}

      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="proposalType" value={proposalType} />
      <input type="hidden" name="cascadeAllocations" value={cascadeAllocationsJson} />

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-400">
          Proposal type
        </label>
        <div className="grid gap-2 sm:grid-cols-3">
          {(
            [
              { value: "standard", label: "Standard / Budget", hint: "Idea + optional funding" },
              { value: "regional_cascade", label: "Regional cascade", hint: "Split treasury across children" },
              { value: "treasury_distribution", label: "Treasury distribution", hint: "Pay out per role rules" },
            ] as { value: ProposalType; label: string; hint: string }[]
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setProposalType(opt.value)}
              className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                proposalType === opt.value
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-100"
                  : "border-neutral-700 bg-neutral-800/50 text-neutral-300 hover:border-neutral-500"
              }`}
            >
              <div className="font-medium">{opt.label}</div>
              <div className="mt-0.5 text-xs text-neutral-500">{opt.hint}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-400">
          Community
        </label>
        <select
          name="communityId"
          value={communityId}
          onChange={(e) => setCommunityId(e.target.value)}
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

      {proposalType === "standard" && (
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
          <p className="mt-1 text-xs text-neutral-500">
            If set and the proposal is approved, funds will be transferred to
            you automatically from the community treasury.
          </p>
        </div>
      )}

      {proposalType === "regional_cascade" && (
        <div className="space-y-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-400">
              Cascade amount (LOOP_TKN)
            </label>
            <input
              id="cascadeAmount"
              name="cascadeAmount"
              type="number"
              step="0.01"
              min="0"
              required
              className="w-full rounded-md border border-neutral-700 bg-neutral-800/50 px-4 py-2.5 text-neutral-100 outline-none transition focus:border-amber-500/50"
              placeholder="e.g. 200000"
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-400">
              Split across children
            </p>
            {children.length === 0 ? (
              <p className="text-sm text-neutral-500">
                This community has no children to cascade to. Pick a parent
                community from the selector above.
              </p>
            ) : (
              <div className="space-y-2">
                {children.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <span className="flex-1 text-sm text-neutral-200">
                      {c.name}{" "}
                      <span className="text-xs text-neutral-500">({c.level})</span>
                    </span>
                    <input
                      type="number"
                      value={splits[c.id] ?? ""}
                      onChange={(e) =>
                        setSplits((s) => ({ ...s, [c.id]: e.target.value }))
                      }
                      step="0.1"
                      min="0"
                      max="100"
                      className="w-20 rounded-md border border-neutral-700 bg-neutral-800/50 px-2 py-1 text-right text-sm text-neutral-100"
                      placeholder="0"
                    />
                    <span className="text-xs text-neutral-500">%</span>
                  </div>
                ))}
                <p
                  className={`text-xs font-medium ${
                    totalSplitPct > 100
                      ? "text-red-400"
                      : totalSplitPct === 100
                        ? "text-green-400"
                        : "text-amber-400"
                  }`}
                >
                  Total: {totalSplitPct.toFixed(1)}%
                  {totalSplitPct < 100 && ` — ${(100 - totalSplitPct).toFixed(1)}% will stay in this community`}
                  {totalSplitPct > 100 && " — Reduce splits below 100%"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {proposalType === "treasury_distribution" && (
        <div className="space-y-3 rounded-md border border-blue-500/30 bg-blue-500/5 p-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-400">
              Distribution amount (LOOP_TKN)
            </label>
            <input
              name="distributionAmount"
              type="number"
              step="0.01"
              min="0"
              required
              className="w-full rounded-md border border-neutral-700 bg-neutral-800/50 px-4 py-2.5 text-neutral-100 outline-none transition focus:border-amber-500/50"
              placeholder="e.g. 5000"
            />
            <p className="mt-1 text-xs text-neutral-500">
              If approved, the community's distribution rules
              (leader/participant/delegator split) fire and pay members from
              this amount.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          name="directDemocracy"
          id="directDemocracy"
          value="true"
          className="mt-1 h-4 w-4 rounded border-neutral-700 bg-neutral-800 accent-amber-500"
        />
        <label htmlFor="directDemocracy" className="text-sm text-neutral-300">
          <span className="font-medium">Direct democracy</span>
          <span className="mt-0.5 block text-xs text-neutral-500">
            All members in this community and below can vote, not just the leadership group.
          </span>
        </label>
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
