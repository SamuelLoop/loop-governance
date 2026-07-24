"use client";

import { useActionState } from "react";
import { convertLoyaltyToLoop } from "./actions";
import { Button } from "@/components/ui/button";

export function ConvertForm({
  balance,
  rate,
}: {
  balance: number;
  rate: number | null;
}) {
  const [state, action, pending] = useActionState(convertLoyaltyToLoop, {
    error: "",
    success: "",
  });

  if (balance <= 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Earn some LOOP_LOYALTY through votes, proposals, or delegations first,
        then you can convert here.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-3">
      {state.error && (
        <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="rounded border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-500">
          {state.success}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Current rate:{" "}
        <span className="font-medium text-foreground">
          1 LOYALTY = {rate?.toFixed(4) ?? "—"} LOOP
        </span>
        . The rate is set by admins and can change over time.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            Amount to convert (max {balance.toLocaleString(undefined, { maximumFractionDigits: 2 })})
          </label>
          <input
            name="amount"
            type="number"
            min="0"
            max={balance}
            step="0.01"
            required
            placeholder="10"
            className="flex h-9 w-40 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Converting…" : "Convert to LOOP"}
        </Button>
      </div>
    </form>
  );
}
