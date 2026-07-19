"use client";

import { useActionState } from "react";
import { cascadeFunds } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CascadeForm({
  communityId,
  balance,
  childCount,
}: {
  communityId: string;
  balance: number;
  childCount: number;
}) {
  const [state, action, pending] = useActionState(cascadeFunds, {
    error: "",
  });

  if (childCount === 0) return null;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="community_id" value={communityId} />

      <div>
        <Label htmlFor={`cascade-${communityId}`} className="text-xs">
          Amount to cascade down
        </Label>
        <Input
          id={`cascade-${communityId}`}
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          max={balance}
          placeholder={balance > 0 ? String(Math.floor(balance)) : "0"}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Available: {balance.toLocaleString()} LOOP. Splits to {childCount} sub-region{childCount !== 1 ? "s" : ""}.
        </p>
      </div>

      {state.error && (
        <p className="text-xs text-destructive">{state.error}</p>
      )}

      {state.result && (
        <div className="rounded-md border bg-muted/50 p-2 text-xs">
          <p className="font-medium">
            Cascaded {Number(state.result.total_cascaded).toLocaleString()} LOOP
          </p>
          <p className="text-muted-foreground">
            Retained {Number(state.result.retained).toLocaleString()} LOOP
          </p>
          {state.result.allocations?.map((a: any) => (
            <p key={a.child_id} className="text-muted-foreground">
              {a.child_name}: {Number(a.amount).toLocaleString()} ({a.pct}%)
            </p>
          ))}
        </div>
      )}

      <Button
        type="submit"
        size="sm"
        disabled={pending || balance <= 0}
        className="w-full"
      >
        {pending ? "Cascading..." : "Cascade to sub-regions"}
      </Button>
    </form>
  );
}
