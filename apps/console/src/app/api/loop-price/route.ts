import { NextResponse } from "next/server";

const LOOP_ADDRESS = "0xb8B309BBD007143cbef1844b75C1Fd038a267F21";
const DEXSCREENER_URL = `https://api.dexscreener.com/latest/dex/tokens/${LOOP_ADDRESS}`;

export const revalidate = 60;

export async function GET() {
  try {
    const res = await fetch(DEXSCREENER_URL, { next: { revalidate: 60 } });
    if (!res.ok) {
      return NextResponse.json({
        price: null,
        priceChange24h: null,
        volume24h: null,
        liquidity: null,
        pairs: [],
        source: "dexscreener",
        status: "no_data",
      });
    }

    const data = await res.json();
    const pairs = data.pairs ?? [];

    if (pairs.length === 0) {
      return NextResponse.json({
        price: null,
        priceChange24h: null,
        volume24h: null,
        liquidity: null,
        pairs: [],
        source: "dexscreener",
        status: "no_pairs",
      });
    }

    const primary = pairs[0];

    return NextResponse.json({
      price: primary.priceUsd ?? null,
      priceNative: primary.priceNative ?? null,
      priceChange24h: primary.priceChange?.h24 ?? null,
      volume24h: primary.volume?.h24 ?? null,
      liquidity: primary.liquidity?.usd ?? null,
      fdv: primary.fdv ?? null,
      pairAddress: primary.pairAddress ?? null,
      dexId: primary.dexId ?? null,
      url: primary.url ?? null,
      pairs: pairs.map((p: any) => ({
        dex: p.dexId,
        pair: `${p.baseToken?.symbol}/${p.quoteToken?.symbol}`,
        price: p.priceUsd,
        volume24h: p.volume?.h24,
        liquidity: p.liquidity?.usd,
        url: p.url,
      })),
      source: "dexscreener",
      status: "ok",
    });
  } catch {
    return NextResponse.json({
      price: null,
      status: "error",
      source: "dexscreener",
    });
  }
}
