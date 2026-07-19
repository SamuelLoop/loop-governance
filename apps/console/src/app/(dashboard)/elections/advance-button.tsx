"use client";

import { useState, useTransition } from "react";
import { advanceElections } from "./actions";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function AdvanceButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  function handleClick() {
    startTransition(async () => {
      const res = await advanceElections();
      if (res.error) {
        setResult(res.error);
      } else {
        const parts: string[] = [];
        if (res.advanced > 0) parts.push(`${res.advanced} advanced`);
        if (res.expired > 0) parts.push(`${res.expired} expired`);
        if (res.triggered > 0) parts.push(`${res.triggered} triggered`);
        setResult(parts.length > 0 ? parts.join(", ") : "No changes");
      }
      setTimeout(() => setResult(null), 4000);
    });
  }

  return (
    <div className="flex items-center gap-2">
      {result && (
        <span className="text-xs text-muted-foreground">{result}</span>
      )}
      <Button variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
        <RefreshCw className={`mr-1 h-3 w-3 ${isPending ? "animate-spin" : ""}`} />
        Advance phases
      </Button>
    </div>
  );
}
