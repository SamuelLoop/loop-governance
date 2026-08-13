"use client";

import { useActionState, useMemo, useState } from "react";
import { createProposal } from "./actions";
import { Glass } from "@loop/ui";

type Community = { id: string; name: string; slug: string; level: string };
type ChildRef = { id: string; name: string; level: string; parent_id: string | null };

type ProposalType = "standard" | "regional_cascade" | "treasury_distribution";

const inputCls =
  "w-full rounded-md border border-surface-border bg-surface px-4 py-2.5 text-text-primary placeholder-text-muted outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/30";
const labelCls =
  "mb-1.5 block text-caption font-medium uppercase tracking-wider text-text-secondary";

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
        <div className="rounded-md border border-error/30 bg-error/10 px-4 py-2.5 text-sm text-error">
          {state.error}
        </div>
      )}

      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="proposalType" value={proposalType} />
      <input type="hidden" name="cascadeAllocations" value={cascadeAllocationsJson} />

      <div>
        <label className={labelCls}>Proposal type</label>
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
              className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                proposalType === opt.value
                  ? "border-primary/50 bg-primary/10 text-text-primary"
                  : "border-surface-border bg-surface text-text-secondary hover:border-text-secondary/50"
              }`}
            >
              <div className="font-medium">{opt.label}</div>
              <div className="mt-0.5 text-xs text-text-muted">{opt.hint}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>Community</label>
        <select
          name="communityId"
          value={communityId}
          onChange={(e) => setCommunityId(e.target.value)}
          required
          className={inputCls}
        >
          {communities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.level})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>Title</label>
        <input
          name="title"
          type="text"
          required
          className={inputCls}
          placeholder="What are you proposing?"
        />
      </div>

      <div>
        <label className={labelCls}>Description</label>
        <textarea
          name="description"
          required
          rows={6}
          className={inputCls}
          placeholder="Describe your proposal in detail. What problem does it solve? What are the expected outcomes?"
        />
      </div>

      {proposalType === "standard" && (
        <div>
          <label className={labelCls}>
            Budget request (USD)
            <span className="ml-1 normal-case text-text-muted">(optional)</span>
          </label>
          <input
            name="budget"
            type="number"
            step="0.01"
            min="0"
            className={inputCls}
            placeholder="0.00"
          />
          <p className="mt-1 text-xs text-text-muted">
            If set and the proposal is approved, funds will be transferred to
            you automatically from the community treasury.
          </p>
        </div>
      )}

      {proposalType === "regional_cascade" && (
        <Glass className="space-y-3 p-4">
          <div>
            <label className={labelCls}>Cascade amount (LOOP_TKN)</label>
            <input
              id="cascadeAmount"
              name="cascadeAmount"
              type="number"
              step="0.01"
              min="0"
              required
              className={inputCls}
              placeholder="e.g. 200000"
            />
          </div>
          <div>
            <p className={labelCls}>Split across children</p>
            {children.length === 0 ? (
              <p className="text-sm text-text-secondary">
                This community has no children to cascade to. Pick a parent
                community from the selector above.
              </p>
            ) : (
              <div className="space-y-2">
                {children.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <span className="flex-1 text-sm text-text-primary">
                      {c.name}{" "}
                      <span className="text-xs text-text-secondary">({c.level})</span>
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
                      className="w-20 rounded-md border border-surface-border bg-surface px-2 py-1 text-right text-sm text-text-primary"
                      placeholder="0"
                    />
                    <span className="text-xs text-text-secondary">%</span>
                  </div>
                ))}
                <p
                  className={`text-xs font-medium ${
                    totalSplitPct > 100
                      ? "text-error"
                      : totalSplitPct === 100
                        ? "text-success"
                        : "text-warning"
                  }`}
                >
                  Total: {totalSplitPct.toFixed(1)}%
                  {totalSplitPct < 100 && ` — ${(100 - totalSplitPct).toFixed(1)}% will stay in this community`}
                  {totalSplitPct > 100 && " — Reduce splits below 100%"}
                </p>
              </div>
            )}
          </div>
        </Glass>
      )}

      {proposalType === "treasury_distribution" && (
        <Glass className="space-y-3 p-4">
          <div>
            <label className={labelCls}>Distribution amount (LOOP_TKN)</label>
            <input
              name="distributionAmount"
              type="number"
              step="0.01"
              min="0"
              required
              className={inputCls}
              placeholder="e.g. 5000"
            />
            <p className="mt-1 text-xs text-text-muted">
              If approved, the community&apos;s distribution rules
              (leader/participant/delegator split) fire and pay members from
              this amount.
            </p>
          </div>
        </Glass>
      )}

      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          name="directDemocracy"
          id="directDemocracy"
          value="true"
          className="mt-1 h-4 w-4 rounded border-surface-border bg-surface accent-primary"
        />
        <label htmlFor="directDemocracy" className="text-sm text-text-secondary">
          <span className="font-medium text-text-primary">Direct democracy</span>
          <span className="mt-0.5 block text-xs text-text-muted">
            All members in this community and below can vote, not just the leadership group.
          </span>
        </label>
      </div>

      <div>
        <label className={labelCls}>
          Consequence
          <span className="ml-1 normal-case text-text-muted">(what happens if approved)</span>
        </label>
        <textarea
          name="consequence"
          rows={3}
          className={inputCls}
          placeholder="What will change as a result of this proposal?"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          name="action"
          value="open"
          className="rounded-button px-6 py-2.5 font-medium text-white shadow-[var(--accent-glow)] transition-opacity hover:opacity-90"
          style={{ background: "var(--accent-gradient)" }}
        >
          Submit and open for voting
        </button>
        <button
          type="submit"
          name="action"
          value="draft"
          className="rounded-button border border-surface-border px-6 py-2.5 text-sm text-text-secondary transition-colors hover:border-text-secondary/50"
        >
          Save as draft
        </button>
      </div>
    </form>
  );
}
