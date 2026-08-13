"use client";

import { useActionState } from "react";
import { castVote } from "./actions";
import { VoteActionPanel } from "@loop/ui";

export function VoteButtons({
  proposalId,
  userId,
  existingChoice,
}: {
  proposalId: string;
  userId: string;
  existingChoice: string | null;
}) {
  const [state, formAction] = useActionState(castVote, { error: "" });

  return (
    <VoteActionPanel existingChoice={existingChoice} error={state.error}>
      <form action={formAction} className="flex gap-2">
        <input type="hidden" name="proposalId" value={proposalId} />
        <input type="hidden" name="userId" value={userId} />
        <button
          type="submit"
          name="choice"
          value="for"
          className="rounded-button bg-success/20 px-5 py-2 text-sm font-medium text-success transition-colors hover:bg-success/30"
        >
          Vote for
        </button>
        <button
          type="submit"
          name="choice"
          value="against"
          className="rounded-button bg-error/20 px-5 py-2 text-sm font-medium text-error transition-colors hover:bg-error/30"
        >
          Vote against
        </button>
        <button
          type="submit"
          name="choice"
          value="abstain"
          className="rounded-button border border-surface-border bg-surface px-5 py-2 text-sm text-text-secondary transition-colors hover:bg-secondary"
        >
          Abstain
        </button>
      </form>
    </VoteActionPanel>
  );
}
