"use server";

import { createClient, createServiceClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

type State = { error: string; success: string };

export async function convertLoyaltyToLoop(
  _prev: State,
  formData: FormData
): Promise<State> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", success: "" };

  const admin = createServiceClient();
  const { data: profile } = await admin
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!profile) return { error: "No profile", success: "" };

  const raw = formData.get("amount");
  const amount = typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Amount must be a positive number", success: "" };
  }

  const { data: result, error } = await admin.rpc("convert_loyalty_to_loop", {
    p_user_id: profile.id,
    p_amount_loyalty: amount,
    p_actor_id: profile.id,
  });

  if (error) return { error: error.message, success: "" };

  revalidatePath("/earnings");
  return {
    error: "",
    success: `Converted ${amount} LOOP_LOYALTY to ${Number(result).toFixed(4)} LOOP_TKN.`,
  };
}
