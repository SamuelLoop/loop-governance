"use client";

import { useActionState } from "react";
import { createElection } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CreateElectionForm({
  communities,
}: {
  communities: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(createElection, { error: "" });

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {state.error}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="community_id">Community</Label>
          <select
            id="community_id"
            name="community_id"
            required
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
          >
            {communities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" required placeholder="Q3 Election" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          name="description"
          rows={2}
          placeholder="What positions are being elected"
        />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="seats">Seats</Label>
          <Input id="seats" name="seats" type="number" defaultValue={5} min={1} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="term_days">Term (days)</Label>
          <Input
            id="term_days"
            name="term_days"
            type="number"
            defaultValue={90}
            min={7}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nomination_days">Nominations (days)</Label>
          <Input
            id="nomination_days"
            name="nomination_days"
            type="number"
            defaultValue={7}
            min={1}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="voting_days">Voting (days)</Label>
          <Input
            id="voting_days"
            name="voting_days"
            type="number"
            defaultValue={7}
            min={1}
          />
        </div>
      </div>
      <Button type="submit">Call election</Button>
    </form>
  );
}
