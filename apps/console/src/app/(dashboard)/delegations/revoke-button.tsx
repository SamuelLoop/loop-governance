"use client";

import { useActionState } from "react";
import { revokeDelegation } from "./actions";

export function RevokeButton({ delegationId }: { delegationId: string }) {
  const [state, formAction] = useActionState(revokeDelegation, { error: "" });

  return (
    <form action={formAction}>
      <input type="hidden" name="delegationId" value={delegationId} />
      {state.error && (
        <p className="text-xs text-red-400">{state.error}</p>
      )}
      <button
        type="submit"
        className="rounded px-3 py-1 text-xs text-red-400 transition hover:bg-red-500/10"
      >
        Revoke
      </button>
    </form>
  );
}
