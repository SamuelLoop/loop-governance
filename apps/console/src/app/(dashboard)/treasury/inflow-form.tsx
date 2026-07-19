"use client";

import { useActionState } from "react";
import { addTreasuryInflow } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const INFLOW_TYPES = [
  { value: "impact_allocation", label: "Impact allocation" },
  { value: "ad_donation", label: "Ad donation" },
  { value: "external_grant", label: "External grant" },
  { value: "member_contribution", label: "Member contribution" },
];

export function InflowForm({ communityId }: { communityId: string }) {
  const [state, action, pending] = useActionState(addTreasuryInflow, {
    error: "",
  });

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="community_id" value={communityId} />

      <div>
        <Label htmlFor={`inflow-type-${communityId}`} className="text-xs">
          Type
        </Label>
        <select
          id={`inflow-type-${communityId}`}
          name="type"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        >
          {INFLOW_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor={`inflow-amount-${communityId}`} className="text-xs">
          Amount (LOOP)
        </Label>
        <Input
          id={`inflow-amount-${communityId}`}
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="1000"
        />
      </div>

      <div>
        <Label htmlFor={`inflow-desc-${communityId}`} className="text-xs">
          Description
        </Label>
        <Input
          id={`inflow-desc-${communityId}`}
          name="description"
          type="text"
          placeholder="Monthly allocation"
        />
      </div>

      {state.error && (
        <p className="text-xs text-destructive">{state.error}</p>
      )}

      <Button type="submit" size="sm" disabled={pending} className="w-full">
        {pending ? "Adding..." : "Add funds"}
      </Button>
    </form>
  );
}
