"use client";

import { useState, useTransition } from "react";
import { rebalanceCommunities } from "./actions";
import { Button } from "@/components/ui/button";

export function RebalanceButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    created?: number;
    error?: string;
  } | null>(null);

  function handleClick() {
    startTransition(async () => {
      const res = await rebalanceCommunities();
      setResult(res);
      if (!res.error) {
        setTimeout(() => setResult(null), 4000);
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span
          className={`text-xs ${
            result.error ? "text-destructive" : "text-green-500"
          }`}
        >
          {result.error
            ? result.error
            : result.created === 0
              ? "All communities within limits"
              : `${result.created} new communit${result.created !== 1 ? "ies" : "y"} created`}
        </span>
      )}
      <Button onClick={handleClick} disabled={isPending}>
        {isPending ? "Splitting..." : "Rebalance now"}
      </Button>
    </div>
  );
}
