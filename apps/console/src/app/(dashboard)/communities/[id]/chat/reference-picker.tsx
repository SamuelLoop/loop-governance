"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Vote,
  Megaphone,
  Coins,
  Star,
  Link2,
  X,
  ChevronDown,
} from "lucide-react";

export type ReferenceType =
  | "proposal"
  | "election"
  | "campaign"
  | "treasury"
  | "power";

export type ReferenceItem = {
  type: ReferenceType;
  id: string;
  title: string;
  subtitle?: string;
  url: string;
};

const REFERENCE_TYPES = [
  { type: "proposal" as const, label: "Proposal", icon: FileText },
  { type: "election" as const, label: "Election", icon: Vote },
  { type: "campaign" as const, label: "Campaign", icon: Megaphone },
  { type: "treasury" as const, label: "Treasury", icon: Coins },
  { type: "power" as const, label: "Power Tree", icon: Star },
];

const TYPE_COLORS: Record<ReferenceType, string> = {
  proposal: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  election: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  campaign: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  treasury: "bg-green-500/10 text-green-400 border-green-500/30",
  power: "bg-red-500/10 text-red-400 border-red-500/30",
};

const TYPE_ICONS: Record<ReferenceType, typeof FileText> = {
  proposal: FileText,
  election: Vote,
  campaign: Megaphone,
  treasury: Coins,
  power: Star,
};

export function ReferenceCard({
  reference,
  onRemove,
}: {
  reference: ReferenceItem;
  onRemove?: () => void;
}) {
  const Icon = TYPE_ICONS[reference.type];
  const colors = TYPE_COLORS[reference.type];

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${colors}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{reference.title}</p>
        {reference.subtitle && (
          <p className="truncate text-[10px] opacity-70">
            {reference.subtitle}
          </p>
        )}
      </div>
      <a
        href={reference.url}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 opacity-60 hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        <Link2 className="h-3 w-3" />
      </a>
      {onRemove && (
        <button
          onClick={onRemove}
          className="shrink-0 opacity-60 hover:opacity-100"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export function ReferencePicker({
  communityId,
  items,
  onSelect,
}: {
  communityId: string;
  items: ReferenceItem[];
  onSelect: (item: ReferenceItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filterType, setFilterType] = useState<ReferenceType | null>(null);

  const filtered = filterType
    ? items.filter((i) => i.type === filterType)
    : items;

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 gap-1 px-2 text-[10px]"
        onClick={() => setOpen(!open)}
      >
        <Link2 className="h-3 w-3" />
        Attach reference
        <ChevronDown className="h-2.5 w-2.5" />
      </Button>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-1 w-80 rounded-lg border bg-popover shadow-lg">
          <div className="border-b p-2">
            <div className="flex gap-1">
              <button
                onClick={() => setFilterType(null)}
                className={`rounded px-2 py-0.5 text-[10px] font-medium transition ${
                  !filterType
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All
              </button>
              {REFERENCE_TYPES.map((rt) => (
                <button
                  key={rt.type}
                  onClick={() => setFilterType(rt.type)}
                  className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium transition ${
                    filterType === rt.type
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <rt.icon className="h-2.5 w-2.5" />
                  {rt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                No items available
              </p>
            ) : (
              <div className="space-y-1">
                {filtered.map((item) => {
                  const Icon = TYPE_ICONS[item.type];
                  return (
                    <button
                      key={`${item.type}-${item.id}`}
                      onClick={() => {
                        onSelect(item);
                        setOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-accent"
                    >
                      <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs">{item.title}</p>
                        {item.subtitle && (
                          <p className="truncate text-[10px] text-muted-foreground">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-[8px]">
                        {item.type}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
