"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";

const LEVELS = ["global", "continental", "national", "city"];

export function CampaignFilters({
  currentLevel,
}: {
  currentLevel?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setFilter(key: string, value: string | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/campaigns?${params.toString()}`);
  }

  return (
    <div>
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Region level
      </p>
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setFilter("level", undefined)}>
          <Badge variant={!currentLevel ? "default" : "outline"}>All</Badge>
        </button>
        {LEVELS.map((l) => (
          <button
            key={l}
            onClick={() =>
              setFilter("level", l === currentLevel ? undefined : l)
            }
          >
            <Badge variant={l === currentLevel ? "default" : "outline"}>
              {l}
            </Badge>
          </button>
        ))}
      </div>
    </div>
  );
}
