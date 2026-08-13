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
        <div className="rounded-md border border-error/30 bg-error/10 px-4 py-2.5 text-sm text-error">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="rounded-md border border-success/30 bg-success/10 px-4 py-2.5 text-sm text-success">
          Accreditation given.
        </div>
      )}

      <input type="hidden" name="giverId" value={giverId} />
      <input type="hidden" name="subjectTag" value={activeSubject} />

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-secondary">
          Peer
        </label>
        <select
          name="receiverId"
          required
          className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary/50"
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
        className="rounded-button px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        style={{ background: "var(--accent-gradient)" }}
      >
        Give accreditation
      </button>
    </form>
  );
}
