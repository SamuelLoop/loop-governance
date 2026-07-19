import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const PRICE_USD = 100; // $1.00 per LOOP in cents

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { amount?: number; userId?: string };
  const amount = body.amount ?? 10;
  const userId = body.userId ?? "anonymous";

  if (amount < 2 || amount % 2 !== 0) {
    return NextResponse.json(
      { error: "Amount must be at least 2 and even" },
      { status: 400 }
    );
  }

  const totalCents = amount * PRICE_USD;
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://portal.loopcmbntr.live";

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: PRICE_USD,
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
      loopAmount: String(amount),
      impactAmount: String(amount / 2),
      allocationAmount: String(amount / 2),
    },
    success_url: `${siteUrl}/buy/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/buy`,
  });

  return NextResponse.json({ url: session.url });
}
