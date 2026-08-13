"use client";

import { useRouter, useSearchParams } from "next/navigation";

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
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-text-secondary">
        Region level
      </p>
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setFilter("level", undefined)}
          className={`rounded-pill px-3 py-1 text-xs font-medium capitalize transition-colors ${
            !currentLevel
              ? "bg-primary text-primary-foreground"
              : "border border-surface-border bg-surface text-text-secondary hover:text-text-primary"
          }`}
        >
          All
        </button>
        {LEVELS.map((l) => (
          <button
            key={l}
            onClick={() =>
              setFilter("level", l === currentLevel ? undefined : l)
            }
            className={`rounded-pill px-3 py-1 text-xs font-medium capitalize transition-colors ${
              l === currentLevel
                ? "bg-primary text-primary-foreground"
                : "border border-surface-border bg-surface text-text-secondary hover:text-text-primary"
            }`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
