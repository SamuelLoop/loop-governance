"use client";

import { useEffect, useState } from "react";

type PriceData = {
  price: string | null;
  priceChange24h: number | null;
  volume24h: number | null;
  liquidity: number | null;
  url: string | null;
  status: string;
};

export function LoopPriceTicker() {
  const [data, setData] = useState<PriceData | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchPrice() {
      try {
        const res = await fetch("/api/loop-price");
        const json = await res.json();
        if (mounted) setData(json);
      } catch {}
    }

    fetchPrice();
    const interval = setInterval(fetchPrice, 60_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!data || data.status !== "ok" || !data.price) {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
        <div className="h-2 w-2 rounded-full bg-amber-500/50" />
        <span className="text-xs text-muted-foreground">
          LOOP price: awaiting liquidity pool
        </span>
      </div>
    );
  }

  const price = parseFloat(data.price);
  const change = data.priceChange24h ?? 0;
  const isUp = change >= 0;

  return (
    <a
      href={data.url ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2 transition hover:bg-muted/50"
    >
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${isUp ? "bg-green-500" : "bg-red-500"}`} />
        <span className="text-sm font-semibold tabular-nums">
          ${price.toFixed(4)}
        </span>
        <span
          className={`text-xs font-medium tabular-nums ${isUp ? "text-green-500" : "text-red-400"}`}
        >
          {isUp ? "+" : ""}{change.toFixed(1)}%
        </span>
      </div>
      {data.volume24h != null && (
        <span className="hidden text-xs text-muted-foreground sm:inline">
          Vol: ${formatCompact(data.volume24h)}
        </span>
      )}
      {data.liquidity != null && (
        <span className="hidden text-xs text-muted-foreground md:inline">
          Liq: ${formatCompact(data.liquidity)}
        </span>
      )}
    </a>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toFixed(0);
}
