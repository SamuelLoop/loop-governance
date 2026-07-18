"use client";

import { useActionState } from "react";
import { castVote } from "./actions";

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

  if (existingChoice) {
    return (
      <p className="text-sm text-neutral-400">
        You voted{" "}
        <span
          className={`font-medium ${
            existingChoice === "for" ? "text-green-500" : existingChoice === "against" ? "text-red-400" : "text-neutral-300"
          }`}
        >
          {existingChoice}
        </span>
      </p>
    );
  }

  return (
    <div>
      {state.error && (
        <p className="mb-2 text-sm text-red-400">{state.error}</p>
      )}
      <p className="mb-2 text-sm text-neutral-400">Cast your vote:</p>
      <form action={formAction} className="flex gap-2">
        <input type="hidden" name="proposalId" value={proposalId} />
        <input type="hidden" name="userId" value={userId} />
        <button
          type="submit"
          name="choice"
          value="for"
          className="rounded-md bg-green-600/20 px-5 py-2 text-sm font-medium text-green-400 transition hover:bg-green-600/30"
        >
          Vote for
        </button>
        <button
          type="submit"
          name="choice"
          value="against"
          className="rounded-md bg-red-500/20 px-5 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/30"
        >
          Vote against
        </button>
        <button
          type="submit"
          name="choice"
          value="abstain"
          className="rounded-md bg-neutral-800 px-5 py-2 text-sm text-neutral-400 transition hover:bg-neutral-700"
        >
          Abstain
        </button>
      </form>
    </div>
  );
}
