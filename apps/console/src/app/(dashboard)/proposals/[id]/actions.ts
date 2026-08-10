"use server";

import { createServiceClient, createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

type State = { error: string };

export async function castVote(
  _prev: State,
  formData: FormData
): Promise<State> {
  // Resolve the acting user from the verified session, not from the form —
  // a client-supplied "userId" field was previously trusted directly here,
  // which let anyone vote as anyone else. See sessions/security-03-treasury-function-audit.md.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const admin = createServiceClient();
  const { data: profile } = await admin
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!profile) return { error: "No profile found." };
  const userId = profile.id;

  const proposalId = formData.get("proposalId") as string;
  const choice = formData.get("choice") as string;

  if (!["for", "against", "abstain"].includes(choice)) {
    return { error: "Invalid vote choice." };
  }

  const { data: proposal } = await admin
    .from("proposals")
    .select("status, community_id, direct_democracy, communities(subject_tags, path, level)")
    .eq("id", proposalId)
    .single();

  if (!proposal || proposal.status !== "open") {
    return { error: "This proposal is not open for voting." };
  }

  const community = (proposal as any).communities;
  const communityPath: string = community?.path ?? "";
  const isDirectDemocracy: boolean = (proposal as any).direct_democracy ?? false;

  // Check voting eligibility
  if (isDirectDemocracy) {
    // Direct democracy: voter must be a member of the proposal's community
    // or any descendant community (path starts with the proposal community's path)
    const { data: eligibleMemberships } = await admin
      .from("community_memberships")
      .select("community_id, communities!inner(path)")
      .eq("user_id", userId);

    const isEligible = (eligibleMemberships ?? []).some((m: any) => {
      const memberPath: string = m.communities?.path ?? "";
      return memberPath === communityPath || memberPath.startsWith(communityPath + ".");
    });

    if (!isEligible) {
      return { error: "You must be a member of this community or a sub-community to vote on this proposal." };
    }
  } else {
    // Representative democracy: voter must be a leader (quorum/admin) at the proposal's community
    const { data: membership } = await admin
      .from("community_memberships")
      .select("role")
      .eq("user_id", userId)
      .eq("community_id", proposal.community_id)
      .single();

    if (!membership || !["quorum", "admin"].includes(membership.role)) {
      return { error: "Only leadership group members at this level can vote on this proposal." };
    }
  }

  // Delegation only applies to representative-democracy proposals. In
  // direct-democracy proposals every eligible member votes for themself,
  // so an existing delegation is not a block. See product note: delegation
  // is a mechanism for representative voting, not a global proxy.
  const subjectTags = community?.subject_tags ?? [];

  if (!isDirectDemocracy) {
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

  // Award loyalty for casting a vote (no-op if disabled or capped)
  await admin.rpc("award_loyalty", {
    p_user_id: userId,
    p_event_type: "vote",
    p_community_id: proposal.community_id,
  });

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
