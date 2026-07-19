"use client";

import { useActionState } from "react";
import { nominate } from "../actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function NominateForm({ electionId }: { electionId: string }) {
  const [state, action] = useActionState(nominate, { error: "" });

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="election_id" value={electionId} />
      {state.error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {state.error}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="statement">Your statement (optional)</Label>
        <Textarea
          id="statement"
          name="statement"
          rows={2}
          placeholder="Why you should be elected"
        />
      </div>
      <Button type="submit" size="sm">
        Nominate yourself
      </Button>
    </form>
  );
}
