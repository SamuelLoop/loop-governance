"use server";

import { createServiceClient, createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

// Resolve the caller's internal users.id from the verified Supabase Auth
// session. Used by createDelegation/revokeDelegation below instead of
// trusting a client-supplied id — see sessions/security-03-treasury-function-audit.md.
async function requireCallerProfileId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createServiceClient();
  const { data: profile } = await admin
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  return profile?.id ?? null;
}

export type OverlappingCommunity = {
  id: string;
  name: string;
  level: string;
  path: string;
};

export async function getOverlappingCommunities(
  userId: string,
  delegateId: string,
  subject: string
): Promise<OverlappingCommunity[]> {
  const admin = createServiceClient();

  const [{ data: myMemberships }, { data: theirMemberships }] = await Promise.all([
    admin
      .from("community_memberships")
      .select("community_id, communities!inner(id, name, level, path, subject)")
      .eq("user_id", userId),
    admin
      .from("community_memberships")
      .select("community_id, communities!inner(id, name, level, path, subject)")
      .eq("user_id", delegateId),
  ]);

  const myCommunityIds = new Set(
    (myMemberships ?? [])
      .filter((m: any) => m.communities?.subject === subject)
      .map((m: any) => m.community_id)
  );

  const overlapping = (theirMemberships ?? [])
    .filter((m: any) => m.communities?.subject === subject && myCommunityIds.has(m.community_id))
    .map((m: any) => ({
      id: m.communities.id,
      name: m.communities.name,
      level: m.communities.level,
      path: m.communities.path,
    }));

  const LEVEL_ORDER = ["global", "continental", "national", "city", "local"];
  overlapping.sort(
    (a: OverlappingCommunity, b: OverlappingCommunity) =>
      LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level) ||
      a.name.localeCompare(b.name)
  );

  return overlapping;
}

type State = { error: string; success: boolean };

export async function createDelegation(
  _prev: State,
  formData: FormData
): Promise<State> {
  const delegatorId = await requireCallerProfileId();
  if (!delegatorId) return { error: "Not authenticated.", success: false };

  const admin = createServiceClient();

  const delegateId = formData.get("delegateId") as string;
  const communityIdsJson = formData.get("communityIds") as string;
  const subjectTag = formData.get("subjectTag") as string;

  let communityIds: string[] = [];
  try {
    communityIds = JSON.parse(communityIdsJson);
  } catch {}

  if (!delegateId || communityIds.length === 0 || !subjectTag) {
    return { error: "Select a person and at least one community.", success: false };
  }

  if (delegatorId === delegateId) {
    return { error: "You cannot delegate to yourself.", success: false };
  }

  const errors: string[] = [];
  let created = 0;

  for (const communityId of communityIds) {
    // Check if the delegate already has a chain that includes the delegator
    const { data: existing } = await admin
      .from("delegations")
      .select("id")
      .eq("delegator_id", delegateId)
      .eq("community_id", communityId)
      .eq("subject_tag", subjectTag)
      .eq("active", true)
      .single();

    if (existing) {
      let current = delegateId;
      const visited = new Set<string>([delegatorId]);
      let isCycle = false;

      for (let depth = 0; depth < 10; depth++) {
        const { data: next } = await admin
          .from("delegations")
          .select("delegate_id")
          .eq("delegator_id", current)
          .eq("community_id", communityId)
          .eq("subject_tag", subjectTag)
          .eq("active", true)
          .single();

        if (!next) break;
        if (visited.has(next.delegate_id)) {
          isCycle = true;
          break;
        }
        visited.add(next.delegate_id);
        current = next.delegate_id;
      }

      if (isCycle) {
        errors.push(`Circular chain detected, skipped one community.`);
        continue;
      }
    }

    await admin
      .from("delegations")
      .update({ active: false, revoked_at: new Date().toISOString() })
      .eq("delegator_id", delegatorId)
      .eq("community_id", communityId)
      .eq("subject_tag", subjectTag)
      .eq("active", true);

    const { error } = await admin.from("delegations").insert({
      delegator_id: delegatorId,
      delegate_id: delegateId,
      community_id: communityId,
      subject_tag: subjectTag,
      active: true,
    });

    if (error) {
      errors.push(error.message);
    } else {
      created++;
    }
  }

  // Award loyalty once per subject session, not per community. Delegating
  // to the same person across many communities counts as a single act of
  // trust for reward purposes. Uses the first successfully created
  // community as the cascade anchor.
  if (created > 0) {
    await admin.rpc("award_loyalty", {
      p_user_id: delegatorId,
      p_event_type: "delegation",
      p_community_id: communityIds[0],
    });
  }

  revalidatePath("/give-power");

  if (errors.length > 0 && created === 0) {
    return { error: errors.join("; "), success: false };
  }

  return {
    error: errors.length > 0 ? `Delegated to ${created} communities. ${errors.join("; ")}` : "",
    success: true,
  };
}

type RevokeState = { error: string };

export async function revokeDelegation(
  _prev: RevokeState,
  formData: FormData
): Promise<RevokeState> {
  const callerId = await requireCallerProfileId();
  if (!callerId) return { error: "Not authenticated." };

  const admin = createServiceClient();

  const delegationId = formData.get("delegationId") as string;

  // Scoped to the caller's own delegator_id — previously this trusted
  // delegationId alone, so anyone could revoke anyone else's delegation
  // by ID. See sessions/security-03-treasury-function-audit.md.
  const { error, count } = await admin
    .from("delegations")
    .update(
      { active: false, revoked_at: new Date().toISOString() },
      { count: "exact" }
    )
    .eq("id", delegationId)
    .eq("delegator_id", callerId);

  if (error) {
    return { error: error.message };
  }
  if (count === 0) {
    return { error: "Delegation not found, or it does not belong to you." };
  }

  revalidatePath("/give-power");
  return { error: "" };
}
