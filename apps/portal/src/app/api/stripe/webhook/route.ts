import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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
    const { userId, loopAmount, impactAmount, allocationAmount } =
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

    await supabase.from("token_purchases").insert({
      user_id: userId !== "anonymous" ? userId : null,
      amount: Number(loopAmount),
      impact_amount: Number(impactAmount),
      allocation_amount: Number(allocationAmount),
      price_usd: Number(loopAmount) * 1.0,
      stripe_payment_intent_id: paymentIntentId,
      stripe_session_id: session.id,
      status: "paid",
    });
  }

  return NextResponse.json({ received: true });
}
