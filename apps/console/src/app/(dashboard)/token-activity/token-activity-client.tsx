"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

type PriceData = {
  price: string | null;
  priceChange24h: number | null;
  volume24h: number | null;
  liquidity: number | null;
  fdv: number | null;
  url: string | null;
  dexId: string | null;
  status: string;
  pairs: {
    dex: string;
    pair: string;
    price: string;
    volume24h: number;
    liquidity: number;
    url: string;
  }[];
};

export function TokenActivityClient() {
  const [data, setData] = useState<PriceData | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch("/api/loop-price");
        const json = await res.json();
        if (mounted) setData(json);
      } catch {}
    }
    load();
    const interval = setInterval(load, 60_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!data || data.status !== "ok" || !data.price) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground">
            DEX market data will appear here once the liquidity pool is live.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Checking DEXScreener every 60 seconds.
          </p>
        </CardContent>
      </Card>
    );
  }

  const price = parseFloat(data.price);
  const change = data.priceChange24h ?? 0;
  const isUp = change >= 0;

  return (
    <div>
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        DEX market data
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Market price
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              ${price.toFixed(4)}
            </p>
            <p
              className={`text-xs font-medium tabular-nums ${isUp ? "text-green-500" : "text-red-400"}`}
            >
              {isUp ? "+" : ""}{change.toFixed(1)}% (24h)
            </p>
          </CardContent>
        </Card>
        {data.volume24h != null && (
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                24h volume
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                ${data.volume24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </CardContent>
          </Card>
        )}
        {data.liquidity != null && (
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Liquidity
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                ${data.liquidity.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </CardContent>
          </Card>
        )}
        {data.fdv != null && (
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                FDV
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                ${data.fdv.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      {data.url && (
        <p className="mt-3 text-center">
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            View on DEXScreener
          </a>
        </p>
      )}
    </div>
  );
}
