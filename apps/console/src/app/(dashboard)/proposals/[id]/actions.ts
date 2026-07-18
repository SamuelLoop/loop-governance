"use server";

import { createServiceClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

type State = { error: string };

export async function castVote(
  _prev: State,
  formData: FormData
): Promise<State> {
  const admin = createServiceClient();

  const proposalId = formData.get("proposalId") as string;
  const userId = formData.get("userId") as string;
  const choice = formData.get("choice") as string;

  if (!["for", "against", "abstain"].includes(choice)) {
    return { error: "Invalid vote choice." };
  }

  const { data: proposal } = await admin
    .from("proposals")
    .select("status, community_id, communities(subject_tags)")
    .eq("id", proposalId)
    .single();

  if (!proposal || proposal.status !== "open") {
    return { error: "This proposal is not open for voting." };
  }

  // Check the voter hasn't already delegated on this subject
  const subjectTags =
    (proposal as any).communities?.subject_tags ?? [];

  const { data: activeDelegation } = await admin
    .from("delegations")
    .select("id, delegate:users!delegations_delegate_id_fkey(display_name)")
    .eq("delegator_id", userId)
    .eq("community_id", proposal.community_id)
    .in("subject_tag", subjectTags.length > 0 ? subjectTags : ["__none__"])
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (activeDelegation) {
    const delegateName = (activeDelegation as any).delegate?.display_name ?? "your delegate";
    return {
      error: `You have delegated your vote on this subject to ${delegateName}. Revoke the delegation first to vote directly.`,
    };
  }

  // Compute vote weight from delegation chain
  const { data: weight } = await admin.rpc("compute_vote_weight", {
    p_voter_id: userId,
    p_community_id: proposal.community_id,
    p_subject_tags: subjectTags.length > 0 ? subjectTags : [],
  });

  const voteWeight = weight ?? 1;

  const { error: voteError } = await admin.from("votes").insert({
    proposal_id: proposalId,
    voter_id: userId,
    choice,
    weight: voteWeight,
  });

  if (voteError) {
    if (voteError.message.includes("duplicate")) {
      return { error: "You have already voted on this proposal." };
    }
    return { error: voteError.message };
  }

  if (choice === "for") {
    await admin.rpc("increment_votes_for", {
      p_id: proposalId,
      p_weight: voteWeight,
    });
  } else if (choice === "against") {
    await admin.rpc("increment_votes_against", {
      p_id: proposalId,
      p_weight: voteWeight,
    });
  }

  revalidatePath(`/proposals/${proposalId}`);
  return { error: "" };
}
