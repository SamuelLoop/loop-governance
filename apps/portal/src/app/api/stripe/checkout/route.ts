import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

type Currency = "usd" | "gbp" | "eur";

const PRICE_PER_TOKEN: Record<Currency, number> = {
  usd: 100, // $1.00
  gbp: 80,  // £0.80
  eur: 90,  // €0.90
};

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
  const body = (await req.json()) as {
    amount?: number;
    currency?: string;
    accessToken?: string;
  };
  const amount = body.amount ?? 10;
  const currency = (body.currency?.toLowerCase() ?? "usd") as Currency;

  if (!PRICE_PER_TOKEN[currency]) {
    return NextResponse.json(
      { error: "Currency must be usd, gbp, or eur" },
      { status: 400 }
    );
  }

  if (amount < 2 || amount % 2 !== 0) {
    return NextResponse.json(
      { error: "Amount must be at least 2 and even" },
      { status: 400 }
    );
  }

  // Resolve user from access token if provided
  let userId = "anonymous";
  if (body.accessToken) {
    const admin = getSupabaseAdmin();
    const { data: { user: authUser } } = await admin.auth.getUser(body.accessToken);
    if (authUser) {
      const { data: profile } = await admin
        .from("users")
        .select("id")
        .eq("auth_id", authUser.id)
        .single();
      if (profile) userId = profile.id;
    }
  }

  const unitAmount = PRICE_PER_TOKEN[currency];
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://gov.loopcmbntr.live";

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency,
          unit_amount: unitAmount,
          product_data: {
            name: "LOOP Utility Token",
            description: `${amount} LOOP tokens for governance, voting, and community funding`,
          },
        },
        quantity: amount,
      },
    ],
    metadata: {
      userId,
      currency,
      loopAmount: String(amount),
      impactAmount: String(amount / 2),
      allocationAmount: String(amount / 2),
    },
    success_url: `https://console.loopcmbntr.live/claim?purchased=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/buy`,
  });

  return NextResponse.json({ url: session.url });
}
