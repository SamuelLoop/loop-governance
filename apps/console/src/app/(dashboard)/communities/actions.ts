"use server";

import { createServiceClient } from "@/lib/supabase-server";
import { createClient } from "@/lib/supabase-server";
import { rebalanceAll, checkAndSplit } from "@/lib/community-split";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function rebalanceCommunities(): Promise<{
  created: number;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { created: 0, error: "Not authenticated" };

  const admin = createServiceClient();
  const { data: profile } = await admin
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!profile) return { created: 0, error: "No profile" };

  // Check user is admin in at least one community
  const { data: adminMembership } = await admin
    .from("community_memberships")
    .select("id")
    .eq("user_id", profile.id)
    .eq("role", "admin")
    .limit(1)
    .single();

  if (!adminMembership)
    return { created: 0, error: "Admin access required" };

  const result = await rebalanceAll();
  revalidatePath("/communities");
  return { created: result.created };
}

export async function triggerSplit(
  communityId: string
): Promise<{ created: number; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { created: 0, error: "Not authenticated" };

  const admin = createServiceClient();
  const { data: profile } = await admin
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!profile) return { created: 0, error: "No profile" };

  const { data: membership } = await admin
    .from("community_memberships")
    .select("role")
    .eq("user_id", profile.id)
    .eq("community_id", communityId)
    .single();

  if (!membership || membership.role !== "admin")
    return { created: 0, error: "Admin access required for this community" };

  const newIds = await checkAndSplit(communityId);
  revalidatePath("/communities");
  revalidatePath(`/communities/${communityId}`);
  return { created: newIds.length };
}

export async function addMemberToCommunity(
  _prev: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const communityId = formData.get("community_id") as string;
  const userEmail = formData.get("user_email") as string;

  if (!communityId || !userEmail) return { error: "Missing fields" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createServiceClient();

  // Find the user to add
  const { data: targetUser } = await admin
    .from("users")
    .select("id")
    .eq("email", userEmail)
    .single();

  if (!targetUser) return { error: "User not found" };

  // Check if already a member
  const { data: existing } = await admin
    .from("community_memberships")
    .select("id")
    .eq("user_id", targetUser.id)
    .eq("community_id", communityId)
    .single();

  if (existing) return { error: "Already a member" };

  const { error: insertErr } = await admin
    .from("community_memberships")
    .insert({
      user_id: targetUser.id,
      community_id: communityId,
      role: "member",
    });

  if (insertErr) return { error: insertErr.message };

  // Check if this community now needs splitting
  await checkAndSplit(communityId);

  revalidatePath("/communities");
  revalidatePath(`/communities/${communityId}`);
  return { error: "" };
}

export async function updateCommunitySettings(
  _prev: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const communityId = formData.get("community_id") as string;
  const quorumSize = parseInt(formData.get("quorum_size") as string);
  const dunbarLimit = parseInt(formData.get("dunbar_limit") as string);
  const maxDelegationDepth = parseInt(formData.get("max_delegation_depth") as string);
  const delegationDecay = parseFloat(formData.get("delegation_decay") as string);
  const quorumThresholdPct = parseFloat(formData.get("quorum_threshold_pct") as string);

  if (!communityId) return { error: "Missing community ID" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createServiceClient();
  const { data: profile } = await admin
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!profile) return { error: "No profile" };

  const { data: membership } = await admin
    .from("community_memberships")
    .select("role")
    .eq("user_id", profile.id)
    .eq("community_id", communityId)
    .single();

  if (!membership || membership.role !== "admin")
    return { error: "Admin access required" };

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  if (!isNaN(quorumSize)) updates.quorum_size = quorumSize;
  if (!isNaN(dunbarLimit)) updates.dunbar_limit = dunbarLimit;
  if (!isNaN(maxDelegationDepth))
    updates.max_delegation_depth = Math.max(1, Math.min(50, maxDelegationDepth));
  if (!isNaN(delegationDecay))
    updates.delegation_decay = Math.max(0.1, Math.min(1, delegationDecay)).toFixed(3);
  if (!isNaN(quorumThresholdPct))
    updates.quorum_threshold_pct = Math.max(1, Math.min(100, quorumThresholdPct)).toFixed(2);

  const { error: updateErr } = await admin
    .from("communities")
    .update(updates)
    .eq("id", communityId);

  if (updateErr) return { error: updateErr.message };

  revalidatePath(`/communities/${communityId}`);
  return { error: "" };
}
