import { createServiceClient } from "@/lib/supabase-server";

/**
 * Every Loop user is a citizen of the Global Governance community by
 * default. Everything else (ecology, economics, technology, and any
 * subject-scoped children below Global) stays opt-in.
 *
 * Idempotent. Safe to call on every dashboard load; the unique constraint
 * on (user_id, community_id) plus onConflict: ignore ensures we don't
 * duplicate.
 */
export async function ensureBaselineMemberships(userId: string): Promise<void> {
  if (!userId) return;
  const admin = createServiceClient();

  const { data: govRoot } = await admin
    .from("communities")
    .select("id")
    .eq("level", "global")
    .eq("subject", "governance")
    .limit(1)
    .maybeSingle();
  if (!govRoot) return;

  const { data: existing } = await admin
    .from("community_memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("community_id", govRoot.id)
    .maybeSingle();
  if (existing) return;

  await admin.from("community_memberships").insert({
    user_id: userId,
    community_id: govRoot.id,
    role: "member",
  });
}
