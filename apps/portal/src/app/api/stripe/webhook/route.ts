import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { sendPurchaseReceipt } from "@/lib/receipt-email";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  usd: "$",
  gbp: "£",
  eur: "€",
};

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { userId, loopAmount, impactAmount, allocationAmount, currency } =
      session.metadata ?? {};

    if (!loopAmount) {
      return NextResponse.json({ received: true });
    }

    const supabase = getSupabaseAdmin();

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : null;

    // Idempotency check
    if (paymentIntentId) {
      const { data: existing } = await supabase
        .from("token_purchases")
        .select("id")
        .eq("stripe_payment_intent_id", paymentIntentId)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ received: true });
      }
    }

    const amount = Number(loopAmount);
    const impact = Number(impactAmount);
    const allocation = Number(allocationAmount);

    await supabase.from("token_purchases").insert({
      user_id: userId !== "anonymous" ? userId : null,
      amount,
      impact_amount: impact,
      allocation_amount: allocation,
      price_usd: amount * 1.0,
      stripe_payment_intent_id: paymentIntentId,
      stripe_session_id: session.id,
      status: "paid",
    });

    // Send receipt email
    if (userId && userId !== "anonymous") {
      try {
        const { data: user } = await supabase
          .from("users")
          .select("email, display_name")
          .eq("id", userId)
          .single();

        if (user?.email) {
          const cur = currency ?? "usd";
          const sym = CURRENCY_SYMBOLS[cur] ?? "$";
          const priceMap: Record<string, number> = { usd: 1.0, gbp: 0.8, eur: 0.9 };
          const total = amount * (priceMap[cur] ?? 1.0);

          await sendPurchaseReceipt({
            email: user.email,
            displayName: user.display_name ?? "there",
            amount,
            impactAmount: impact,
            allocationAmount: allocation,
            totalMinted: amount + impact + allocation,
            priceFormatted: `${sym}${total.toFixed(2)}`,
            currency: cur,
            date: new Date().toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
            paymentMethod: "card",
          });
        }
      } catch {}
    }
  }

  return NextResponse.json({ received: true });
}
