"use server";

import { requireAdminSession } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase-server";
import {
  transferImpactTreasuryOnChain,
  registerCommunityWalletOnChain,
  isConfigured,
} from "@/lib/loop-token";
import type { Address } from "viem";
import { revalidatePath } from "next/cache";

type State = { error: string; success: string; txHash?: string };

export async function transferImpactTreasury(
  _prev: State,
  formData: FormData
): Promise<State> {
  const session = await requireAdminSession();
  if (session.platformRole !== "platform_admin") {
    return { error: "Only platform admins can move the Impact Treasury", success: "" };
  }
  if (!isConfigured()) {
    return { error: "On-chain not configured", success: "" };
  }

  const recipient = (formData.get("recipient") as string)?.trim();
  const label = (formData.get("label") as string)?.trim() || null;
  const reason = (formData.get("reason") as string)?.trim() || null;
  const amount = Number(formData.get("amount"));

  if (!recipient || !/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
    return { error: "Recipient must be a valid 0x address", success: "" };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Amount must be a positive number", success: "" };
  }

  try {
    const txHash = await transferImpactTreasuryOnChain(recipient as Address, amount);
    const admin = createServiceClient();
    await admin.from("impact_treasury_transfers").insert({
      recipient_wallet: recipient,
      recipient_label: label,
      amount,
      reason,
      tx_hash: txHash,
      actor_user_id: session.userId,
    });
    await admin.from("admin_audit_log").insert({
      white_label_id: null,
      actor_id: session.userId,
      event_type: "impact_treasury.transferred",
      target_type: "loop_token",
      target_id: recipient,
      detail: { amount, label, reason, tx_hash: txHash },
    });
    revalidatePath("/treasury");
    return { error: "", success: `Transferred ${amount} LOOP.`, txHash };
  } catch (err: any) {
    return { error: err?.shortMessage || err?.message || "Transfer failed", success: "" };
  }
}

export async function registerCommunityWallet(
  _prev: State,
  formData: FormData
): Promise<State> {
  const session = await requireAdminSession();
  if (session.platformRole !== "platform_admin") {
    return { error: "Only platform admins can register community wallets", success: "" };
  }
  if (!isConfigured()) {
    return { error: "On-chain not configured", success: "" };
  }

  const communityId = (formData.get("community_id") as string)?.trim();
  const wallet = (formData.get("wallet") as string)?.trim();

  if (!communityId) return { error: "Community is required", success: "" };
  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return { error: "Wallet must be a valid 0x address", success: "" };
  }

  try {
    const txHash = await registerCommunityWalletOnChain(communityId, wallet as Address);
    const admin = createServiceClient();
    await admin.from("admin_audit_log").insert({
      white_label_id: null,
      actor_id: session.userId,
      event_type: "impact_treasury.community_wallet_registered",
      target_type: "loop_token",
      target_id: communityId,
      detail: { wallet, tx_hash: txHash },
    });
    revalidatePath("/treasury");
    return { error: "", success: `Registered wallet for community.`, txHash };
  } catch (err: any) {
    return { error: err?.shortMessage || err?.message || "Registration failed", success: "" };
  }
}
