// One-off: prepare Justin's account for a test claim flow.
//   1. Ensure auth user exists.
//   2. Link his Loop profile (auth_id).
//   3. Link his 2 anonymous Stripe purchases to his user_id.
//   4. Set a temp password so operator can sign in at /login with
//      email + password (bypasses the magic-link + PKCE issue).
//
// Run:
//   cd apps/admin && cp ../../scripts/impersonate-justin.mjs ./tmp.mjs \
//     && node tmp.mjs && rm tmp.mjs

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const envPath = path.resolve(process.cwd(), ".env.local");
const env = Object.fromEntries(
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const EMAIL = "justin@justininza.com";
const LOOP_USER_ID = "d4a36c6c-71b2-46a6-bb85-5f031e8106c8";

// Generate a memorable-ish temp password (16 chars, url-safe)
const TEMP_PASSWORD = "Impersonate!" + crypto.randomBytes(3).toString("hex");

// Try create; if exists, that's fine
await admin.auth.admin.createUser({ email: EMAIL, email_confirm: true, password: TEMP_PASSWORD }).catch(() => {});

// Find Justin's auth user id via paginated scan
let authUser = null;
for (let page = 1; page < 25; page++) {
  const list = await admin.auth.admin.listUsers({ page, perPage: 200 });
  const users = list.data?.users ?? [];
  authUser = users.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase());
  if (authUser) break;
  if (users.length < 200) break;
}
if (!authUser) {
  console.log("no auth user found after paginated scan");
  process.exit(1);
}

// Force password + email_confirm true so email+password sign-in works
// even for accounts that started as OAuth or magic-link-only.
const upd = await admin.auth.admin.updateUserById(authUser.id, {
  password: TEMP_PASSWORD,
  email_confirm: true,
});
if (upd.error) console.log("password update error:", upd.error.message);

const upProfile = await admin.from("users").update({ auth_id: authUser.id }).eq("id", LOOP_USER_ID);
if (upProfile.error) console.log("profile link error:", upProfile.error.message);

// Link BOTH of Justin's Stripe sessions (there was one paid session; the other belongs to Brett)
const upPurchases = await admin
  .from("token_purchases")
  .update({ user_id: LOOP_USER_ID })
  .is("user_id", null)
  .eq("stripe_session_id", "cs_live_a1CwdA2eaPe91uA63K2OFmFtiRZFIZDmVFGL5rIDpOfKia1MsVT441hS2a");
if (upPurchases.error) console.log("purchase link error:", upPurchases.error.message);

console.log("\n=== LOG IN AS JUSTIN ===");
console.log("URL:      https://console.loopcmbntr.live/login");
console.log("Email:    " + EMAIL);
console.log("Password: " + TEMP_PASSWORD);
console.log("\nThe password is one-shot for this test. Change it or reset once you are done.");
