// Daily sweep of expired allocation slices.
//
// Finds slices with expires_at < now and remaining_amount > 0, then calls
// directAllocationFor on the LOOP contract to move each expired amount to
// the platform's designated "Impact Treasury community" (env-configured).
//
// Runs via Vercel Cron. Secured via CRON_SECRET header comparison.

import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import {
  directAllocationForOnChain,
  communityIdToBytes32,
  publicClient,
  chainConfig,
  isConfigured,
  LOOP_TOKEN_ABI,
} from "@/lib/loop-token";
import type { Address } from "viem";

const IMPACT_SWEEP_COMMUNITY_UUID =
  process.env.IMPACT_SWEEP_COMMUNITY_UUID ?? "";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isConfigured()) {
    return NextResponse.json({ skipped: "chain not configured" });
  }
  if (!IMPACT_SWEEP_COMMUNITY_UUID) {
    return NextResponse.json({
      skipped: "IMPACT_SWEEP_COMMUNITY_UUID env var not set",
    });
  }

  const admin = createServiceClient();
  const nowIso = new Date().toISOString();

  const { data: expired } = await admin
    .from("allocation_slices")
    .select("id, buyer_wallet, remaining_amount")
    .lt("expires_at", nowIso)
    .gt("remaining_amount", 0)
    .is("swept_at", null)
    .limit(200);

  if (!expired || expired.length === 0) {
    return NextResponse.json({ swept: 0 });
  }

  // Verify the sweep community wallet is registered on-chain
  const { address } = chainConfig();
  const client = publicClient();
  const bytes32 = communityIdToBytes32(IMPACT_SWEEP_COMMUNITY_UUID);
  const communityWallet = (await client.readContract({
    address,
    abi: LOOP_TOKEN_ABI,
    functionName: "communityWallets",
    args: [bytes32],
  })) as string;
  if (!communityWallet || communityWallet === "0x0000000000000000000000000000000000000000") {
    return NextResponse.json(
      {
        error:
          "Impact sweep community has no registered on-chain wallet. Set one via admin > Impact Treasury.",
      },
      { status: 400 }
    );
  }

  let succeeded = 0;
  const errors: string[] = [];
  for (const slice of expired) {
    try {
      const amount = Number(slice.remaining_amount);
      if (amount <= 0) continue;

      const txHash = await directAllocationForOnChain(
        slice.buyer_wallet as Address,
        bytes32,
        amount
      );

      await admin
        .from("allocation_slices")
        .update({
          swept_at: new Date().toISOString(),
          swept_tx_hash: txHash,
          remaining_amount: 0,
        })
        .eq("id", slice.id);

      await admin.from("allocation_directions").insert({
        buyer_wallet: slice.buyer_wallet,
        community_id: IMPACT_SWEEP_COMMUNITY_UUID,
        amount,
        reason: "expiry_sweep",
        tx_hash: txHash,
      });

      succeeded++;
    } catch (err: any) {
      errors.push(err?.shortMessage || err?.message || "unknown");
    }
  }

  return NextResponse.json({ swept: succeeded, total: expired.length, errors });
}
