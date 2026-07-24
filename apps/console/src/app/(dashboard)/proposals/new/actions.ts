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
  const budget = formData.get("budget") as string | null;
  const consequence = formData.get("consequence") as string | null;
  const directDemocracy = formData.get("directDemocracy") === "true";
  const proposalType = (formData.get("proposalType") as string) || "standard";
  const cascadeAllocationsJson = formData.get("cascadeAllocations") as string | null;
  const distributionAmountStr = formData.get("distributionAmount") as string | null;
  const action = formData.get("action") as string;

  if (!title || !description) {
    return { error: "Title and description are required." };
  }
  if (!["standard", "regional_cascade", "treasury_distribution"].includes(proposalType)) {
    return { error: "Invalid proposal type." };
  }

  let cascadeAllocations: Record<string, unknown> | null = null;
  let distributionAmount: number | null = null;

  if (proposalType === "regional_cascade") {
    try {
      const parsed = cascadeAllocationsJson ? JSON.parse(cascadeAllocationsJson) : null;
      if (
        !parsed ||
        typeof parsed !== "object" ||
        typeof parsed.amount !== "number" ||
        parsed.amount <= 0 ||
        !Array.isArray(parsed.splits) ||
        parsed.splits.length === 0
      ) {
        return { error: "Cascade proposals need an amount and at least one split." };
      }
      const totalPct = parsed.splits.reduce(
        (s: number, x: any) => s + Number(x.pct ?? 0),
        0
      );
      if (totalPct <= 0 || totalPct > 100) {
        return { error: "Cascade split percentages must sum to > 0 and <= 100." };
      }
      cascadeAllocations = parsed;
    } catch {
      return { error: "Invalid cascade allocations shape." };
    }
  }

  if (proposalType === "treasury_distribution") {
    const n = Number(distributionAmountStr);
    if (!Number.isFinite(n) || n <= 0) {
      return { error: "Distribution amount must be a positive number." };
    }
    distributionAmount = n;
  }

  const status = action === "open" ? "open" : "draft";
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("proposals")
    .insert({
      community_id: communityId,
      author_id: userId,
      title,
      description,
      status,
      proposal_type: proposalType,
      budget_request_cents:
        proposalType === "standard" && budget && Number(budget) > 0
          ? Math.round(parseFloat(budget) * 100)
          : null,
      cascade_allocations: cascadeAllocations,
      distribution_amount: distributionAmount,
      consequence: consequence || null,
      direct_democracy: directDemocracy,
      opens_at: status === "open" ? now : null,
      closes_at:
        status === "open"
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          : null,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  if (status === "open") {
    await admin.rpc("award_loyalty", {
      p_user_id: userId,
      p_event_type: "proposal",
      p_community_id: communityId,
    });
  }

  redirect(`/proposals/${data.id}`);
}
