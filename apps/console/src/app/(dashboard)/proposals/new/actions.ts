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
    opens_at: status === "open" ? now : null,
    closes_at: status === "open"
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : null,
  }).select("id").single();

  if (error) {
    return { error: error.message };
  }

  redirect(`/proposals/${data.id}`);
}
