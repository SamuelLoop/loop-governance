import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const envPath = path.resolve(process.cwd(), ".env.local");
const env = Object.fromEntries(
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: user } = await admin
  .from("users")
  .select("id, auth_id, email, display_name")
  .eq("email", "justin@justininza.com")
  .single();
console.log("Justin's Loop profile:", user);

const { data: byUser } = await admin
  .from("token_purchases")
  .select("id, amount, user_id, status, stripe_session_id, minted_at")
  .eq("user_id", user.id);
console.log("purchases where user_id=Justin.id:", byUser?.length ?? 0, byUser);

const { data: allByEmail } = await admin
  .from("token_purchases")
  .select("id, amount, user_id, status, stripe_session_id, minted_at")
  .in("stripe_session_id", [
    "cs_live_a1CwdA2eaPe91uA63K2OFmFtiRZFIZDmVFGL5rIDpOfKia1MsVT441hS2a",
    "cs_live_a1YttbnG5XCnNdS6yZ38yenIyVBbbTCowyfy5iu7LNDMUQjw4qbHcjtNQR",
  ]);
console.log("Justin+Brett Stripe sessions:", allByEmail);
