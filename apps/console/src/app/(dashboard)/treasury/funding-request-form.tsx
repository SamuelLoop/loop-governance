"use client";

import { useActionState } from "react";
import { submitFundingRequest } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Community = { id: string; name: string; level: string };

export function FundingRequestForm({
  communities,
}: {
  communities: Community[];
}) {
  const [state, action, pending] = useActionState(submitFundingRequest, {
    error: "",
  });

  return (
    <form action={action} className="space-y-3">
      <div>
        <Label htmlFor="fr-community" className="text-xs">
          Request on behalf of
        </Label>
        <select
          id="fr-community"
          name="community_id"
          required
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        >
          <option value="">Select community</option>
          {communities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.level})
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="fr-title" className="text-xs">
          Title
        </Label>
        <Input
          id="fr-title"
          name="title"
          type="text"
          required
          placeholder="What is this funding for?"
        />
      </div>

      <div>
        <Label htmlFor="fr-description" className="text-xs">
          Description
        </Label>
        <textarea
          id="fr-description"
          name="description"
          required
          rows={3}
          placeholder="Explain how these funds will be used and the expected impact on your region or subject."
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground"
        />
      </div>

      <div>
        <Label htmlFor="fr-amount" className="text-xs">
          Amount (LOOP)
        </Label>
        <Input
          id="fr-amount"
          name="amount"
          type="number"
          step="0.01"
          min="1"
          required
          placeholder="5000"
        />
      </div>

      {state.error && (
        <p className="text-xs text-destructive">{state.error}</p>
      )}

      <Button type="submit" size="sm" disabled={pending} className="w-full">
        {pending ? "Submitting..." : "Submit funding request"}
      </Button>
    </form>
  );
}
