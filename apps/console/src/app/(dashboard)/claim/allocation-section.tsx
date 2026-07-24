"use client";

import { useActionState, useState } from "react";
import type { AllocationSlice, CommunityOption } from "./actions";
import { directAllocationSlice } from "./actions";
import { Button } from "@/components/ui/button";
import { Wallet, ExternalLink } from "lucide-react";

function daysLeft(expiresAtIso: string): number {
  const now = Date.now();
  const exp = new Date(expiresAtIso).getTime();
  const diff = Math.max(0, exp - now);
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

function SliceRow({
  slice,
  communities,
}: {
  slice: AllocationSlice;
  communities: CommunityOption[];
}) {
  const [state, action] = useActionState(directAllocationSlice, {
    error: "",
    success: "",
  });
  const [amount, setAmount] = useState<string>(String(slice.remaining_amount));
  const [communityId, setCommunityId] = useState<string>(communities[0]?.id ?? "");
  const [reason, setReason] = useState<string>("philanthropy");

  const remaining = slice.remaining_amount;
  const original = slice.original_amount;
  const daysRemaining = daysLeft(slice.expires_at);

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold tabular-nums">
            {remaining.toLocaleString()} LOOP
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              of {original.toLocaleString()} allocation
            </span>
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            wallet {slice.buyer_wallet.slice(0, 6)}...{slice.buyer_wallet.slice(-4)}
          </p>
          <p
            className={`mt-1 text-xs ${
              daysRemaining < 30 ? "text-amber-400" : "text-muted-foreground"
            }`}
          >
            {daysRemaining} day{daysRemaining === 1 ? "" : "s"} left to spend before it
            transfers to the Impact Treasury
          </p>
        </div>
      </div>

      {state.error && (
        <p className="mt-2 text-xs text-destructive">{state.error}</p>
      )}
      {state.success && (
        <div className="mt-2 flex items-center gap-2 text-xs text-emerald-400">
          <span>{state.success}</span>
          {state.txHash && (
            <a
              href={`https://basescan.org/tx/${state.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:underline"
            >
              tx <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      <form action={action} className="mt-3 flex flex-wrap items-end gap-2">
        <input type="hidden" name="slice_id" value={slice.id} />
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Community
          </label>
          <select
            name="community_id"
            value={communityId}
            onChange={(e) => setCommunityId(e.target.value)}
            className="flex h-9 w-64 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {communities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.level})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            As
          </label>
          <select
            name="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="flex h-9 w-36 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="philanthropy">Philanthropy</option>
            <option value="advertising">Advertising</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Amount
          </label>
          <input
            name="amount"
            type="number"
            min="1"
            max={remaining}
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex h-9 w-24 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <Button type="submit" size="sm">
          Direct
        </Button>
      </form>
    </div>
  );
}

export function AllocationSection({
  slices,
  communities,
}: {
  slices: AllocationSlice[];
  communities: CommunityOption[];
}) {
  if (slices.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-card/40 p-6 text-center">
        <Wallet className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          Your allocation balance appears here after you claim a cash-purchased
          token to a wallet. You can then direct each allocation slice to a
          community as philanthropy or as advertising, before it expires and
          transfers to the Impact Treasury.
        </p>
      </div>
    );
  }
  const totalRemaining = slices.reduce((s, x) => s + x.remaining_amount, 0);
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <h3 className="text-sm font-medium">Your allocation</h3>
          <p className="text-xs text-muted-foreground">
            Direct each slice to a community as philanthropy or advertising
            before it expires.
          </p>
        </div>
        <p className="text-sm font-semibold tabular-nums text-amber-400">
          {totalRemaining.toLocaleString()} LOOP available
        </p>
      </div>
      <div className="space-y-3">
        {slices.map((s) => (
          <SliceRow key={s.id} slice={s} communities={communities} />
        ))}
      </div>
    </div>
  );
}
