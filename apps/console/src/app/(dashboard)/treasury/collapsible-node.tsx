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
        className="mb-2 flex w-full items-center gap-2 rounded-panel border border-surface-border bg-surface px-4 py-3 text-left backdrop-blur-[var(--blur-glass)] transition-colors hover:bg-accent/50"
      >
        <ChevronRight
          className={`h-4 w-4 shrink-0 text-text-secondary transition-transform ${open ? "rotate-90" : ""}`}
        />
        <div className="flex flex-1 items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-body font-medium text-text-primary">{label}</span>
            <span className="rounded-pill border border-surface-border px-1.5 py-0.5 text-[10px] text-text-secondary">
              {level}
            </span>
          </div>
          <div className="flex items-center gap-4 text-caption text-text-secondary">
            {proposalCount > 0 && (
              <span>
                <span className="font-mono font-medium text-text-primary">{proposalCount}</span>{" "}
                proposal{proposalCount !== 1 ? "s" : ""}
              </span>
            )}
            {requestedFunds > 0 && (
              <span>
                <span className="font-mono font-medium text-warning">
                  {requestedFunds.toLocaleString()}
                </span>{" "}
                LOOP requested
              </span>
            )}
            <span className="font-mono font-medium text-text-primary">
              {balance.toLocaleString()} LOOP
            </span>
            {hasChildren && (
              <span className="text-text-muted">
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
