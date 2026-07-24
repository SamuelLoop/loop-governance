// One-off: enroll every existing Loop user in the Global Governance
// community. Idempotent - re-running does nothing after the first pass.
//
// Run from apps/admin (needs @supabase/supabase-js on the node path):
//   cd apps/admin && cp ../../scripts/backfill-baseline-memberships.mjs ./t.mjs \
//     && node t.mjs && rm t.mjs

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

const { data: govRoot } = await admin
  .from("communities")
  .select("id, name")
  .eq("level", "global")
  .eq("subject", "governance")
  .limit(1)
  .single();
console.log("Governance root:", govRoot);

const { data: users } = await admin
  .from("users")
  .select("id")
  .limit(10000);
console.log("Loop users found:", users?.length ?? 0);

const { data: existingMemberships } = await admin
  .from("community_memberships")
  .select("user_id")
  .eq("community_id", govRoot.id);
const alreadyIn = new Set((existingMemberships ?? []).map((m) => m.user_id));
console.log("Already members:", alreadyIn.size);

const rows = (users ?? [])
  .filter((u) => !alreadyIn.has(u.id))
  .map((u) => ({
    user_id: u.id,
    community_id: govRoot.id,
    role: "member",
  }));
console.log("New enrollments to insert:", rows.length);

if (rows.length === 0) {
  console.log("nothing to do");
  process.exit(0);
}

for (let i = 0; i < rows.length; i += 500) {
  const batch = rows.slice(i, i + 500);
  const { error } = await admin.from("community_memberships").insert(batch);
  if (error) {
    console.error(`batch ${i}: ${error.message}`);
    process.exit(1);
  }
  console.log(`inserted batch ${i} - ${i + batch.length}`);
}
console.log(`done - ${rows.length} users enrolled in Governance Global`);
