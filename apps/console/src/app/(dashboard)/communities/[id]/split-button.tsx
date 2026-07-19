"use client";

import { useState, useTransition } from "react";
import { triggerSplit } from "../actions";
import { Button } from "@/components/ui/button";

export function SplitButton({
  communityId,
  atLimit,
}: {
  communityId: string;
  atLimit: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    created?: number;
    error?: string;
  } | null>(null);

  function handleClick() {
    startTransition(async () => {
      const res = await triggerSplit(communityId);
      setResult(res);
      if (!res.error) {
        setTimeout(() => setResult(null), 4000);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        onClick={handleClick}
        disabled={isPending}
        variant={atLimit ? "destructive" : "outline"}
      >
        {isPending ? "Splitting..." : atLimit ? "Split now" : "Force split"}
      </Button>
      {result && (
        <span
          className={`text-xs ${
            result.error ? "text-destructive" : "text-green-500"
          }`}
        >
          {result.error
            ? result.error
            : result.created === 0
              ? "No split needed"
              : `${result.created} new communit${result.created !== 1 ? "ies" : "y"} created`}
        </span>
      )}
    </div>
  );
}
