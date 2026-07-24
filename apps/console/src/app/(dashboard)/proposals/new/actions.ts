"use server";

import { createServiceClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

type State = { error: string };

export async function createProposal(
  _prev: State,
  formData: FormData
): Promise<State> {
  const admin = createServiceClient();

  const userId = formData.get("userId") as string;
  const communityId = formData.get("communityId") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const budget = formData.get("budget") as string;
  const consequence = formData.get("consequence") as string;
  const directDemocracy = formData.get("directDemocracy") === "true";
  const action = formData.get("action") as string;

  if (!title || !description) {
    return { error: "Title and description are required." };
  }

  const status = action === "open" ? "open" : "draft";
  const now = new Date().toISOString();

  const { data, error } = await admin.from("proposals").insert({
    community_id: communityId,
    author_id: userId,
    title,
    description,
    status,
    budget_request_cents: budget ? Math.round(parseFloat(budget) * 100) : null,
    consequence: consequence || null,
    direct_democracy: directDemocracy,
    opens_at: status === "open" ? now : null,
    closes_at: status === "open"
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : null,
  }).select("id").single();

  if (error) {
    return { error: error.message };
  }

  // Only award loyalty when the proposal is actually published (open),
  // not while a member is still working on a draft.
  if (status === "open") {
    await admin.rpc("award_loyalty", {
      p_user_id: userId,
      p_event_type: "proposal",
      p_community_id: communityId,
    });
  }

  redirect(`/proposals/${data.id}`);
}
