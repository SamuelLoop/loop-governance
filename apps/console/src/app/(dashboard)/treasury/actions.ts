"use server";

import { createClient, createServiceClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export type DistributionRules = {
  leader_pct: number;
  participant_pct: number;
  delegator_pct: number;
  min_activity_threshold: number;
  distribution_period_days: number;
};

const DEFAULTS: DistributionRules = {
  leader_pct: 40,
  participant_pct: 35,
  delegator_pct: 25,
  min_activity_threshold: 1,
  distribution_period_days: 30,
};

export async function getDistributionRules(
  communityId: string
): Promise<DistributionRules> {
  const admin = createServiceClient();
  const { data } = await admin
    .from("distribution_rules")
    .select("leader_pct, participant_pct, delegator_pct, min_activity_threshold, distribution_period_days")
    .eq("community_id", communityId)
    .single();

  if (!data) return DEFAULTS;
  return {
    leader_pct: Number(data.leader_pct),
    participant_pct: Number(data.participant_pct),
    delegator_pct: Number(data.delegator_pct),
    min_activity_threshold: data.min_activity_threshold,
    distribution_period_days: data.distribution_period_days,
  };
}

async function requireAdmin(communityId: string): Promise<{ error?: string; userId?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createServiceClient();
  const { data: profile } = await admin
    .from("users")
    .select("id, platform_role")
    .eq("auth_id", user.id)
    .single();

  if (!profile) return { error: "No profile" };

  if (profile.platform_role === "platform_admin") return { userId: profile.id };

  const { data: membership } = await admin
    .from("community_memberships")
    .select("role")
    .eq("user_id", profile.id)
    .eq("community_id", communityId)
    .single();

  if (!membership || !["admin", "quorum"].includes(membership.role))
    return { error: "Admin access required" };

  return { userId: profile.id };
}

async function requireAuth(): Promise<{ error?: string; userId?: string; isPlatformAdmin?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createServiceClient();
  const { data: profile } = await admin
    .from("users")
    .select("id, platform_role")
    .eq("auth_id", user.id)
    .single();

  if (!profile) return { error: "No profile" };
  return { userId: profile.id, isPlatformAdmin: profile.platform_role === "platform_admin" };
}

export async function updateDistributionRules(
  _prev: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const communityId = formData.get("community_id") as string;
  if (!communityId) return { error: "Missing community ID" };

  const leaderPct = parseFloat(formData.get("leader_pct") as string);
  const participantPct = parseFloat(formData.get("participant_pct") as string);
  const delegatorPct = parseFloat(formData.get("delegator_pct") as string);
  let minThreshold = parseInt(formData.get("min_activity_threshold") as string);
  let periodDays = parseInt(formData.get("distribution_period_days") as string);

  if (isNaN(leaderPct) || isNaN(participantPct) || isNaN(delegatorPct))
    return { error: "All percentage fields are required" };

  const sum = Math.round((leaderPct + participantPct + delegatorPct) * 100) / 100;
  if (sum !== 100)
    return { error: "Percentages must sum to 100" };

  if (leaderPct < 0 || participantPct < 0 || delegatorPct < 0)
    return { error: "Percentages cannot be negative" };

  minThreshold = isNaN(minThreshold) ? 1 : Math.max(1, minThreshold);
  periodDays = isNaN(periodDays) ? 30 : Math.max(7, Math.min(365, periodDays));

  const { error: authError } = await requireAdmin(communityId);
  if (authError) return { error: authError };

  const admin = createServiceClient();
  const { error: upsertError } = await admin
    .from("distribution_rules")
    .upsert(
      {
        community_id: communityId,
        leader_pct: leaderPct,
        participant_pct: participantPct,
        delegator_pct: delegatorPct,
        min_activity_threshold: minThreshold,
        distribution_period_days: periodDays,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "community_id" }
    );

  if (upsertError) return { error: upsertError.message };

  revalidatePath("/treasury");
  return { error: "" };
}

export async function triggerDistribution(
  _prev: { error: string; result?: any },
  formData: FormData
): Promise<{ error: string; result?: any }> {
  const communityId = formData.get("community_id") as string;
  const amount = parseFloat(formData.get("amount") as string);

  if (!communityId) return { error: "Missing community ID" };
  if (isNaN(amount) || amount <= 0) return { error: "Amount must be positive" };

  const { error: authError } = await requireAdmin(communityId);
  if (authError) return { error: authError };

  const admin = createServiceClient();
  const { data, error } = await admin.rpc("distribute_treasury", {
    p_community_id: communityId,
    p_amount: amount,
  });

  if (error) return { error: error.message };

  revalidatePath("/treasury");
  return { error: "", result: data };
}

export async function getTreasuryBalance(communityId: string) {
  const admin = createServiceClient();
  const { data } = await admin
    .from("community_treasury_balance")
    .select("*")
    .eq("community_id", communityId)
    .single();

  return data ?? { balance: 0, total_inflow: 0, total_outflow: 0, inflow_count: 0, outflow_count: 0 };
}

export async function addTreasuryInflow(
  _prev: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const communityId = formData.get("community_id") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const type = formData.get("type") as string;
  const description = formData.get("description") as string;

  if (!communityId) return { error: "Missing community ID" };
  if (isNaN(amount) || amount <= 0) return { error: "Amount must be positive" };
  if (!type) return { error: "Type is required" };

  const { error: authError } = await requireAdmin(communityId);
  if (authError) return { error: authError };

  const admin = createServiceClient();
  const { error } = await admin.from("treasury_transactions").insert({
    community_id: communityId,
    type,
    direction: "inflow",
    amount,
    description: description || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/treasury");
  return { error: "" };
}

// ── Platform pool and funding requests ──

export async function getPlatformPool() {
  const admin = createServiceClient();
  const { data } = await admin
    .from("platform_pool")
    .select("*")
    .eq("id", "main")
    .single();

  return data ?? { balance: 0, total_allocated: 0, total_deposited: 0 };
}

export async function submitFundingRequest(
  _prev: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const communityId = formData.get("community_id") as string;
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const amount = parseFloat(formData.get("amount") as string);

  if (!communityId) return { error: "Select a community" };
  if (!title || title.length < 5) return { error: "Title must be at least 5 characters" };
  if (!description || description.length < 20) return { error: "Description must be at least 20 characters" };
  if (isNaN(amount) || amount <= 0) return { error: "Amount must be positive" };

  const { error: authError, userId } = await requireAdmin(communityId);
  if (authError) return { error: authError };

  const admin = createServiceClient();
  const { error } = await admin.from("funding_requests").insert({
    community_id: communityId,
    requested_by: userId,
    title,
    description,
    amount,
  });

  if (error) return { error: error.message };

  revalidatePath("/treasury");
  return { error: "" };
}

export async function approveFundingRequest(
  _prev: { error: string; result?: any },
  formData: FormData
): Promise<{ error: string; result?: any }> {
  const requestId = formData.get("request_id") as string;
  const note = (formData.get("note") as string)?.trim() || null;

  if (!requestId) return { error: "Missing request ID" };

  const { error: authError, userId, isPlatformAdmin } = await requireAuth();
  if (authError) return { error: authError };

  const admin = createServiceClient();

  const { data: req } = await admin
    .from("funding_requests")
    .select("community_id")
    .eq("id", requestId)
    .single();

  if (!req) return { error: "Request not found" };

  if (!isPlatformAdmin) {
    const { data: membership } = await admin
      .from("community_memberships")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "quorum"])
      .limit(1)
      .single();

    if (!membership) return { error: "Quorum or admin access required" };
  }

  const { data, error } = await admin.rpc("approve_funding_request", {
    p_request_id: requestId,
    p_reviewer_id: userId,
    p_note: note,
  });

  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };

  revalidatePath("/treasury");
  return { error: "", result: data };
}

export async function rejectFundingRequest(
  _prev: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const requestId = formData.get("request_id") as string;
  const note = (formData.get("note") as string)?.trim() || null;

  if (!requestId) return { error: "Missing request ID" };

  const { error: authError, userId } = await requireAuth();
  if (authError) return { error: authError };

  const admin = createServiceClient();

  const { error } = await admin
    .from("funding_requests")
    .update({
      status: "rejected",
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      review_note: note,
    })
    .eq("id", requestId)
    .eq("status", "pending");

  if (error) return { error: error.message };

  revalidatePath("/treasury");
  return { error: "" };
}

// ── Cascade allocations ──

export async function getRegionalAllocations(parentCommunityId: string) {
  const admin = createServiceClient();
  const { data } = await admin
    .from("regional_allocations")
    .select(
      `allocation_pct,
      child:communities!regional_allocations_child_community_id_fkey(id, name, level)`
    )
    .eq("parent_community_id", parentCommunityId)
    .order("allocation_pct", { ascending: false });

  return ((data ?? []) as unknown as { allocation_pct: number; child: { id: string; name: string; level: string } }[]);
}

export async function updateRegionalAllocation(
  _prev: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const parentId = formData.get("parent_community_id") as string;
  const childId = formData.get("child_community_id") as string;
  const pct = parseFloat(formData.get("allocation_pct") as string);

  if (!parentId || !childId) return { error: "Missing community IDs" };
  if (isNaN(pct) || pct < 0 || pct > 100) return { error: "Percentage must be 0-100" };

  const { error: authError } = await requireAdmin(parentId);
  if (authError) return { error: authError };

  const admin = createServiceClient();

  const { data: existing } = await admin
    .from("regional_allocations")
    .select("allocation_pct")
    .eq("parent_community_id", parentId)
    .neq("child_community_id", childId);

  const otherTotal = (existing ?? []).reduce((s, r) => s + Number(r.allocation_pct), 0);
  if (otherTotal + pct > 100)
    return { error: `Total would be ${(otherTotal + pct).toFixed(1)}%. Maximum is 100%.` };

  const { error } = await admin.from("regional_allocations").upsert(
    {
      parent_community_id: parentId,
      child_community_id: childId,
      allocation_pct: pct,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "parent_community_id,child_community_id" }
  );

  if (error) return { error: error.message };

  revalidatePath("/treasury");
  return { error: "" };
}

export async function cascadeFunds(
  _prev: { error: string; result?: any },
  formData: FormData
): Promise<{ error: string; result?: any }> {
  const communityId = formData.get("community_id") as string;
  const amount = parseFloat(formData.get("amount") as string);

  if (!communityId) return { error: "Missing community ID" };
  if (isNaN(amount) || amount <= 0) return { error: "Amount must be positive" };

  const { error: authError } = await requireAdmin(communityId);
  if (authError) return { error: authError };

  const admin = createServiceClient();
  const { data, error } = await admin.rpc("cascade_treasury", {
    p_parent_community_id: communityId,
    p_amount: amount,
  });

  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };

  revalidatePath("/treasury");
  return { error: "", result: data };
}
