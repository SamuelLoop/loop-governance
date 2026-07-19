"use client";

import { useActionState } from "react";
import { updateDistributionRules, type DistributionRules } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RulesForm({
  communityId,
  rules,
}: {
  communityId: string;
  rules: DistributionRules;
}) {
  const [state, action, pending] = useActionState(updateDistributionRules, {
    error: "",
  });

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="community_id" value={communityId} />

      <div>
        <Label htmlFor={`leader-${communityId}`} className="text-xs">
          Leaders %
        </Label>
        <Input
          id={`leader-${communityId}`}
          name="leader_pct"
          type="number"
          step="0.01"
          min="0"
          max="100"
          defaultValue={rules.leader_pct}
        />
      </div>

      <div>
        <Label htmlFor={`participant-${communityId}`} className="text-xs">
          Participants %
        </Label>
        <Input
          id={`participant-${communityId}`}
          name="participant_pct"
          type="number"
          step="0.01"
          min="0"
          max="100"
          defaultValue={rules.participant_pct}
        />
      </div>

      <div>
        <Label htmlFor={`delegator-${communityId}`} className="text-xs">
          Delegators %
        </Label>
        <Input
          id={`delegator-${communityId}`}
          name="delegator_pct"
          type="number"
          step="0.01"
          min="0"
          max="100"
          defaultValue={rules.delegator_pct}
        />
      </div>

      <div>
        <Label htmlFor={`threshold-${communityId}`} className="text-xs">
          Min activity (actions/period)
        </Label>
        <Input
          id={`threshold-${communityId}`}
          name="min_activity_threshold"
          type="number"
          min="1"
          defaultValue={rules.min_activity_threshold}
        />
      </div>

      <div>
        <Label htmlFor={`period-${communityId}`} className="text-xs">
          Period (days)
        </Label>
        <Input
          id={`period-${communityId}`}
          name="distribution_period_days"
          type="number"
          min="7"
          max="365"
          defaultValue={rules.distribution_period_days}
        />
      </div>

      {state.error && (
        <p className="text-xs text-destructive">{state.error}</p>
      )}

      <Button type="submit" size="sm" disabled={pending} className="w-full">
        {pending ? "Saving..." : "Save rules"}
      </Button>
    </form>
  );
}
