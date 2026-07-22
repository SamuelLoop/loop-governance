"use server";

import { createClient, createServiceClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export type Purchase = {
  id: string;
  amount: number;
  impact_amount: number;
  allocation_amount: number;
  price_usd: number;
  status: string;
  wallet_address: string | null;
  minted_at: string | null;
  created_at: string;
  stripe_payment_intent_id: string | null;
};

async function getProfile() {
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
  return profile;
}

export async function getPurchases(): Promise<Purchase[]> {
  const profile = await getProfile();
  if (!profile) return [];

  const admin = createServiceClient();
  const { data } = await admin
    .from("token_purchases")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  return (data ?? []) as Purchase[];
}

export async function claimPurchase(
  _prev: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const purchaseId = formData.get("purchase_id") as string;
  const walletAddress = (formData.get("wallet_address") as string)?.trim();

  if (!walletAddress) return { error: "Wallet address is required" };
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return { error: "Invalid Ethereum address" };
  }

  const profile = await getProfile();
  if (!profile) return { error: "Not authenticated" };

  const admin = createServiceClient();

  const { data: purchase } = await admin
    .from("token_purchases")
    .select("id, user_id, status, wallet_address, minted_at")
    .eq("id", purchaseId)
    .single();

  if (!purchase) return { error: "Purchase not found" };
  if (purchase.user_id !== profile.id) return { error: "Not your purchase" };
  if (purchase.minted_at) return { error: "Already minted" };

  const { error } = await admin
    .from("token_purchases")
    .update({
      wallet_address: walletAddress,
      status: "claimed",
    })
    .eq("id", purchaseId);

  if (error) return { error: error.message };

  revalidatePath("/claim");
  return { error: "" };
}

export async function setDefaultWallet(
  _prev: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const walletAddress = (formData.get("wallet_address") as string)?.trim();

  if (!walletAddress) return { error: "Wallet address is required" };
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return { error: "Invalid Ethereum address" };
  }

  const profile = await getProfile();
  if (!profile) return { error: "Not authenticated" };

  const admin = createServiceClient();

  // Update all unclaimed purchases with this wallet
  await admin
    .from("token_purchases")
    .update({
      wallet_address: walletAddress,
      status: "claimed",
    })
    .eq("user_id", profile.id)
    .eq("status", "paid")
    .is("wallet_address", null);

  revalidatePath("/claim");
  return { error: "" };
}
