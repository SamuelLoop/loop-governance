"use client";

import { useActionState } from "react";
import { triggerDistribution } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DistributeForm({
  communityId,
  balance,
}: {
  communityId: string;
  balance: number;
}) {
  const [state, action, pending] = useActionState(triggerDistribution, {
    error: "",
  });

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="community_id" value={communityId} />

      <div>
        <Label htmlFor={`dist-amount-${communityId}`} className="text-xs">
          Amount to distribute
        </Label>
        <Input
          id={`dist-amount-${communityId}`}
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          max={balance}
          placeholder={balance > 0 ? String(balance) : "0"}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Available: {balance.toLocaleString()} LOOP
        </p>
      </div>

      {state.error && (
        <p className="text-xs text-destructive">{state.error}</p>
      )}

      {state.result && (
        <div className="rounded-md border bg-muted/50 p-2 text-xs">
          <p>Leaders paid: {state.result.leaders_paid}</p>
          <p>Participants paid: {state.result.participants_paid}</p>
          <p>Delegators paid: {state.result.delegators_paid}</p>
          <p className="mt-1 font-medium">
            Total: {Number(state.result.total_distributed).toLocaleString()} LOOP
          </p>
        </div>
      )}

      <Button
        type="submit"
        size="sm"
        disabled={pending || balance <= 0}
        className="w-full"
      >
        {pending ? "Distributing..." : "Run distribution"}
      </Button>
    </form>
  );
}
