// One-off: backfill the two paid Stripe sessions from 2026-07-20 that
// missed the token_purchases table because the webhook URL was pointing
// at the console domain instead of the portal domain.
// Safe to re-run: uses stripe_payment_intent_id as the idempotency key.

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const envPath = path.resolve(process.cwd(), "apps/admin/.env.local");
const env = Object.fromEntries(
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const rows = [
  {
    session_id: "cs_live_a1CwdA2eaPe91uA63K2OFmFtiRZFIZDmVFGL5rIDpOfKia1MsVT441hS2a",
    pi: "pi_3TvDcURqlMbizRJB0Hn6ChLq",
    created_at: "2026-07-20T10:36:00Z",
    email: "justin@justininza.com",
  },
  {
    session_id: "cs_live_a1YttbnG5XCnNdS6yZ38yenIyVBbbTCowyfy5iu7LNDMUQjw4qbHcjtNQR",
    pi: "pi_3Tv6aCRqlMbizRJB1M27JFEC",
    created_at: "2026-07-20T03:03:00Z",
    email: "bretteaton1216@gmail.com",
  },
];

for (const r of rows) {
  const { data: existing } = await admin
    .from("token_purchases")
    .select("id")
    .eq("stripe_payment_intent_id", r.pi)
    .maybeSingle();
  if (existing) {
    console.log("already exists, skipping:", r.pi);
    continue;
  }
  const { error } = await admin.from("token_purchases").insert({
    user_id: null,
    amount: 10,
    impact_amount: 5,
    allocation_amount: 5,
    price_usd: 10,
    stripe_payment_intent_id: r.pi,
    stripe_session_id: r.session_id,
    status: "paid",
    created_at: r.created_at,
  });
  console.log(r.email, error ? "ERR: " + error.message : "inserted");
}

const { count } = await admin
  .from("token_purchases")
  .select("id", { count: "exact", head: true });
console.log("total rows now:", count);
