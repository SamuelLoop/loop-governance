"use client";

import { useActionState } from "react";
import { updateCommunitySettings } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SettingsForm({
  communityId,
  quorumSize,
  dunbarLimit,
  maxDelegationDepth,
  delegationDecay,
  quorumThresholdPct,
}: {
  communityId: string;
  quorumSize: number;
  dunbarLimit: number;
  maxDelegationDepth: number;
  delegationDecay: number;
  quorumThresholdPct: number;
}) {
  const [state, action] = useActionState(updateCommunitySettings, {
    error: "",
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        {state.error && (
          <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {state.error}
          </div>
        )}
        <form action={action} className="space-y-4">
          <input type="hidden" name="community_id" value={communityId} />
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="quorum_size">Leadership group size</Label>
              <Input
                id="quorum_size"
                type="number"
                name="quorum_size"
                defaultValue={quorumSize}
                min={1}
                className="w-24"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dunbar_limit">Dunbar limit</Label>
              <Input
                id="dunbar_limit"
                type="number"
                name="dunbar_limit"
                defaultValue={dunbarLimit}
                min={10}
                className="w-24"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="max_delegation_depth">Max delegation depth</Label>
              <Input
                id="max_delegation_depth"
                type="number"
                name="max_delegation_depth"
                defaultValue={maxDelegationDepth}
                min={1}
                max={50}
                className="w-24"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quorum_threshold_pct">Leadership threshold %</Label>
              <Input
                id="quorum_threshold_pct"
                type="number"
                name="quorum_threshold_pct"
                defaultValue={quorumThresholdPct}
                min={1}
                max={100}
                step={0.5}
                className="w-24"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="delegation_decay">Delegation decay</Label>
              <Input
                id="delegation_decay"
                type="number"
                name="delegation_decay"
                defaultValue={delegationDecay}
                min={0.1}
                max={1}
                step={0.05}
                className="w-24"
              />
            </div>
            <Button type="submit" variant="outline">
              Save
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Decay = 1.0 means full transitive voting (no loss per hop). Decay = 0.9 means 10% loss per hop in the delegation chain. Leadership threshold is the % of total community votes needed to earn a leadership group seat.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
