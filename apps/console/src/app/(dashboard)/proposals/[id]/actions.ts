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
    .select("status")
    .eq("id", proposalId)
    .single();

  if (!proposal || proposal.status !== "open") {
    return { error: "This proposal is not open for voting." };
  }

  const { error: voteError } = await admin.from("votes").insert({
    proposal_id: proposalId,
    voter_id: userId,
    choice,
  });

  if (voteError) {
    if (voteError.message.includes("duplicate")) {
      return { error: "You have already voted on this proposal." };
    }
    return { error: voteError.message };
  }

  if (choice === "for") {
    await admin.rpc("increment_votes_for", { p_id: proposalId });
  } else if (choice === "against") {
    await admin.rpc("increment_votes_against", { p_id: proposalId });
  }

  revalidatePath(`/proposals/${proposalId}`);
  return { error: "" };
}
