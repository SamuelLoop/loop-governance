"use server";

import { createServiceClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

type State = { error: string; success: boolean };

export async function createDelegation(
  _prev: State,
  formData: FormData
): Promise<State> {
  const admin = createServiceClient();

  const delegatorId = formData.get("delegatorId") as string;
  const delegateId = formData.get("delegateId") as string;
  const communityId = formData.get("communityId") as string;
  const subjectTag = formData.get("subjectTag") as string;

  if (!delegateId || !communityId || !subjectTag) {
    return { error: "All fields are required.", success: false };
  }

  if (delegatorId === delegateId) {
    return { error: "You cannot delegate to yourself.", success: false };
  }

  // Check for circular delegation: would this create a loop?
  // Walk the chain from delegateId to see if it leads back to delegatorId
  const { data: chain } = await admin.rpc("compute_vote_weight", {
    p_voter_id: delegatorId,
    p_community_id: communityId,
    p_subject_tags: [subjectTag],
  });

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
    // The delegate has already delegated on this subject.
    // Walk the chain manually to detect a cycle.
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
      return {
        error:
          "This delegation would create a circular chain. Choose a different delegate.",
        success: false,
      };
    }
  }

  // Deactivate any existing delegation for this subject first (upsert pattern)
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
    return { error: error.message, success: false };
  }

  revalidatePath("/delegations");
  return { error: "", success: true };
}

type RevokeState = { error: string };

export async function revokeDelegation(
  _prev: RevokeState,
  formData: FormData
): Promise<RevokeState> {
  const admin = createServiceClient();

  const delegationId = formData.get("delegationId") as string;

  const { error } = await admin
    .from("delegations")
    .update({ active: false, revoked_at: new Date().toISOString() })
    .eq("id", delegationId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/delegations");
  return { error: "" };
}
