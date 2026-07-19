"use client";

import { useActionState } from "react";
import { castElectionVote } from "../actions";
import { Button } from "@/components/ui/button";

export function VoteButton({
  electionId,
  candidateId,
}: {
  electionId: string;
  candidateId: string;
}) {
  const [state, action] = useActionState(castElectionVote, { error: "" });

  return (
    <form action={action}>
      <input type="hidden" name="election_id" value={electionId} />
      <input type="hidden" name="candidate_id" value={candidateId} />
      {state.error && (
        <span className="mr-2 text-xs text-destructive">{state.error}</span>
      )}
      <Button type="submit" variant="outline" size="sm">
        Vote
      </Button>
    </form>
  );
}
