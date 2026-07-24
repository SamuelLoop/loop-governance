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

const JUSTIN = "d4a36c6c-71b2-46a6-bb85-5f031e8106c8";

const { data: profile } = await admin
  .from("users")
  .select("id, email, display_name, location_name, source_white_label_id")
  .eq("id", JUSTIN)
  .single();
console.log("Justin profile:", profile);

const { data: mems } = await admin
  .from("community_memberships")
  .select("community_id, role, joined_at, communities(name, subject, level)")
  .eq("user_id", JUSTIN);
console.log("Justin memberships (count " + (mems?.length ?? 0) + "):", mems);

const { data: govRoots } = await admin
  .from("communities")
  .select("id, name, subject, level, visibility")
  .eq("level", "global")
  .eq("subject", "governance");
console.log("Governance global root(s):", govRoots);
