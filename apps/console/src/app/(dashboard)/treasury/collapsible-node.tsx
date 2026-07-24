"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

export function CollapsibleNode({
  label,
  level,
  balance,
  proposalCount,
  requestedFunds,
  childCount,
  defaultOpen,
  content,
  children,
}: {
  label: string;
  level: string;
  balance: number;
  proposalCount: number;
  requestedFunds: number;
  childCount: number;
  defaultOpen: boolean;
  content: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const hasChildren = childCount > 0;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mb-2 flex w-full items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-left transition hover:bg-accent/50"
      >
        <ChevronRight
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
        />
        <div className="flex flex-1 items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{label}</span>
            <span className="rounded-full border px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {level}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {proposalCount > 0 && (
              <span>
                <span className="font-mono font-medium text-foreground">{proposalCount}</span>{" "}
                proposal{proposalCount !== 1 ? "s" : ""}
              </span>
            )}
            {requestedFunds > 0 && (
              <span>
                <span className="font-mono font-medium text-amber-500">
                  {requestedFunds.toLocaleString()}
                </span>{" "}
                LOOP requested
              </span>
            )}
            <span className="font-mono font-medium text-foreground">
              {balance.toLocaleString()} LOOP
            </span>
            {hasChildren && (
              <span className="text-muted-foreground/60">
                {childCount} sub-{childCount === 1 ? "community" : "communities"}
              </span>
            )}
          </div>
        </div>
      </button>

      {open && (
        <div className="mb-4">
          {content}
          {children}
        </div>
      )}
    </div>
  );
}
