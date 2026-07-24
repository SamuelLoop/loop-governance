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

const JUSTIN_USER_ID = "d4a36c6c-71b2-46a6-bb85-5f031e8106c8";
const JUSTIN_PURCHASE_ID = "b6167988-f262-46a8-bd2d-afdffd13941b";

const { data, error } = await admin
  .from("token_purchases")
  .update({ user_id: JUSTIN_USER_ID })
  .eq("id", JUSTIN_PURCHASE_ID)
  .select();
console.log("linked:", data, "error:", error?.message);

const { data: check } = await admin
  .from("token_purchases")
  .select("id, user_id, amount, status")
  .eq("user_id", JUSTIN_USER_ID);
console.log("Justin now owns:", check);
