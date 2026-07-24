"use client";

import { useActionState } from "react";
import { giveAccreditation } from "./actions";

type Member = { id: string; display_name: string };

export function AccreditForm({
  giverId,
  members,
  activeSubject,
}: {
  giverId: string;
  members: Member[];
  activeSubject: string;
}) {
  const [state, formAction] = useActionState(giveAccreditation, { error: "", success: false });

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="rounded-md border border-green-500/30 bg-green-500/10 px-4 py-2.5 text-sm text-green-400">
          Accreditation given.
        </div>
      )}

      <input type="hidden" name="giverId" value={giverId} />
      <input type="hidden" name="subjectTag" value={activeSubject} />

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-400">
          Peer
        </label>
        <select
          name="receiverId"
          required
          className="w-full rounded-md border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-amber-500/50"
        >
          <option value="">Select a member</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.display_name}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Accreditation is a public declaration that this person knows{" "}
          <span className="font-medium text-foreground">{activeSubject}</span>.
          It boosts their standing in every community, no location required.
        </p>
      </div>

      <button
        type="submit"
        className="rounded-md bg-amber-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-amber-500"
      >
        Give accreditation
      </button>
    </form>
  );
}
