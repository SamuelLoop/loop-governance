"use server";

import { createServiceClient, createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createElection(
  _prev: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const communityId = formData.get("community_id") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const seats = parseInt(formData.get("seats") as string) || 5;
  const termDays = parseInt(formData.get("term_days") as string) || 90;
  const nominationDays =
    parseInt(formData.get("nomination_days") as string) || 7;
  const votingDays = parseInt(formData.get("voting_days") as string) || 7;

  if (!communityId || !title) return { error: "Title and community required" };

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

  if (!membership || !["admin", "quorum"].includes(membership.role))
    return { error: "Admin or quorum role required" };

  const now = new Date();
  const nomClose = new Date(
    now.getTime() + nominationDays * 24 * 60 * 60 * 1000
  );
  const voteOpen = nomClose;
  const voteClose = new Date(
    voteOpen.getTime() + votingDays * 24 * 60 * 60 * 1000
  );

  const { data: election, error } = await admin
    .from("elections")
    .insert({
      community_id: communityId,
      title,
      description: description || null,
      seats,
      term_days: termDays,
      nominations_open: now.toISOString(),
      nominations_close: nomClose.toISOString(),
      voting_open: voteOpen.toISOString(),
      voting_close: voteClose.toISOString(),
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/elections");
  redirect(`/elections/${election.id}`);
}

export async function nominate(
  _prev: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const electionId = formData.get("election_id") as string;
  const statement = formData.get("statement") as string;

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

  const { data: election } = await admin
    .from("elections")
    .select("status, community_id")
    .eq("id", electionId)
    .single();

  if (!election) return { error: "Election not found" };
  if (election.status !== "nominations")
    return { error: "Nominations are closed" };

  const { data: membership } = await admin
    .from("community_memberships")
    .select("id")
    .eq("user_id", profile.id)
    .eq("community_id", election.community_id)
    .single();

  if (!membership)
    return { error: "You must be a community member to stand" };

  const { error } = await admin.from("candidates").insert({
    election_id: electionId,
    user_id: profile.id,
    statement: statement || null,
  });

  if (error) {
    if (error.message.includes("duplicate"))
      return { error: "Already nominated" };
    return { error: error.message };
  }

  revalidatePath(`/elections/${electionId}`);
  return { error: "" };
}

export async function castElectionVote(
  _prev: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const electionId = formData.get("election_id") as string;
  const candidateId = formData.get("candidate_id") as string;

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

  const { data: election } = await admin
    .from("elections")
    .select("status, community_id")
    .eq("id", electionId)
    .single();

  if (!election) return { error: "Election not found" };
  if (election.status !== "voting") return { error: "Voting is not open" };

  const { data: membership } = await admin
    .from("community_memberships")
    .select("id")
    .eq("user_id", profile.id)
    .eq("community_id", election.community_id)
    .single();

  if (!membership) return { error: "You must be a community member to vote" };

  // Compute delegation weight
  const { data: weight } = await admin.rpc("compute_vote_weight", {
    p_voter_id: profile.id,
    p_community_id: election.community_id,
    p_subject_tags: [],
  });

  const { error } = await admin.from("election_votes").insert({
    election_id: electionId,
    voter_id: profile.id,
    candidate_id: candidateId,
    weight: weight ?? 1,
  });

  if (error) {
    if (error.message.includes("duplicate"))
      return { error: "Already voted for this candidate" };
    return { error: error.message };
  }

  revalidatePath(`/elections/${electionId}`);
  return { error: "" };
}

export async function advanceElections(): Promise<{
  advanced: number;
  expired: number;
  triggered: number;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { advanced: 0, expired: 0, triggered: 0, error: "Not authenticated" };

  const admin = createServiceClient();

  const { data: advResult } = await admin.rpc("advance_election_phases");
  const { data: expResult } = await admin.rpc("expire_quorum_terms");
  const { data: trigResult } = await admin.rpc("check_and_trigger_elections");

  revalidatePath("/elections");
  return {
    advanced: advResult ?? 0,
    expired: expResult ?? 0,
    triggered: trigResult ?? 0,
  };
}
