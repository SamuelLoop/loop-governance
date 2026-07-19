"use client";

import { useActionState } from "react";
import { approveFundingRequest, rejectFundingRequest } from "./actions";
import { Button } from "@/components/ui/button";

export function ApproveButton({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState(approveFundingRequest, {
    error: "",
  });

  return (
    <form action={action} className="inline">
      <input type="hidden" name="request_id" value={requestId} />
      {state.error && (
        <p className="mb-1 text-xs text-destructive">{state.error}</p>
      )}
      {state.result ? (
        <span className="text-xs text-green-500">
          Disbursed {Number(state.result.amount).toLocaleString()} LOOP
        </span>
      ) : (
        <Button type="submit" size="sm" variant="default" disabled={pending}>
          {pending ? "..." : "Approve & disburse"}
        </Button>
      )}
    </form>
  );
}

export function RejectButton({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState(rejectFundingRequest, {
    error: "",
  });

  return (
    <form action={action} className="inline">
      <input type="hidden" name="request_id" value={requestId} />
      {state.error ? (
        <p className="text-xs text-destructive">{state.error}</p>
      ) : (
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={pending}
        >
          {pending ? "..." : "Reject"}
        </Button>
      )}
    </form>
  );
}
