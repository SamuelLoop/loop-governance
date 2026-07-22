import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPurchaseReceipt } from "@/lib/receipt-email";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    amount: number;
    walletAddress: string;
    txHash: string;
    ethPaid: string;
    accessToken?: string;
  };

  if (!body.amount || !body.walletAddress || !body.txHash) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Resolve user if access token provided
  let userId: string | null = null;
  if (body.accessToken) {
    const { data: { user } } = await supabase.auth.getUser(body.accessToken);
    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .single();
      if (profile) userId = profile.id;
    }
  }

  // Idempotency on tx hash
  const { data: existing } = await supabase
    .from("token_purchases")
    .select("id")
    .eq("stripe_payment_intent_id", `crypto:${body.txHash}`)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true });
  }

  const impact = Math.floor(body.amount / 2);
  const allocation = Math.floor(body.amount / 2);

  await supabase.from("token_purchases").insert({
    user_id: userId,
    amount: body.amount,
    impact_amount: impact,
    allocation_amount: allocation,
    price_usd: body.amount * 1.0,
    stripe_payment_intent_id: `crypto:${body.txHash}`,
    stripe_session_id: null,
    status: "minted",
    wallet_address: body.walletAddress,
    minted_at: new Date().toISOString(),
  });

  // Send receipt email
  if (userId) {
    try {
      const { data: user } = await supabase
        .from("users")
        .select("email, display_name")
        .eq("id", userId)
        .single();

      if (user?.email) {
        const ethPaid = body.ethPaid ?? `${(body.amount * 0.0004).toFixed(4)}`;
        await sendPurchaseReceipt({
          email: user.email,
          displayName: user.display_name ?? "there",
          amount: body.amount,
          impactAmount: impact,
          allocationAmount: allocation,
          totalMinted: body.amount + impact + allocation,
          priceFormatted: `${ethPaid} ETH`,
          currency: "ETH",
          date: new Date().toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          paymentMethod: "crypto",
        });
      }
    } catch {}
  }

  return NextResponse.json({ ok: true });
}
