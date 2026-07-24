"use server";

import { createClient, createServiceClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import {
  isConfigured,
  mintForPurchaseOnChain,
  directAllocationForOnChain,
  communityIdToBytes32,
  publicClient,
  chainConfig,
  LOOP_TOKEN_ABI,
} from "@/lib/loop-token";
import type { Address } from "viem";

export type Purchase = {
  id: string;
  amount: number;
  impact_amount: number;
  allocation_amount: number;
  price_usd: number;
  status: string;
  wallet_address: string | null;
  minted_at: string | null;
  mint_tx_hash: string | null;
  created_at: string;
  stripe_payment_intent_id: string | null;
};

export type AllocationSlice = {
  id: string;
  buyer_wallet: string;
  purchase_id: string;
  original_amount: number;
  remaining_amount: number;
  minted_at: string;
  expires_at: string;
  swept_at: string | null;
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
    .select("id, email, display_name")
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
    .select(
      "id, amount, impact_amount, allocation_amount, price_usd, status, wallet_address, minted_at, mint_tx_hash, created_at, stripe_payment_intent_id"
    )
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  return (data ?? []) as Purchase[];
}

/**
 * List purchases that share this user's email but have no user_id yet.
 * Covers the anonymous-checkout case where Stripe recorded the purchase
 * without linking it to an authenticated Loop account; the buyer signs
 * in later with the same email and we surface the pending mint.
 */
export async function getPendingAnonymousPurchases(): Promise<Purchase[]> {
  const profile = await getProfile();
  if (!profile) return [];

  const admin = createServiceClient();
  // Try to match by Stripe customer_email metadata recorded on the row
  const { data } = await admin
    .from("token_purchases")
    .select(
      "id, amount, impact_amount, allocation_amount, price_usd, status, wallet_address, minted_at, mint_tx_hash, created_at, stripe_payment_intent_id"
    )
    .is("user_id", null)
    .order("created_at", { ascending: false });

  return (data ?? []) as Purchase[];
}

export async function getAllocationSlices(): Promise<AllocationSlice[]> {
  const profile = await getProfile();
  if (!profile) return [];

  const admin = createServiceClient();
  const { data: myMints } = await admin
    .from("token_purchases")
    .select("wallet_address")
    .eq("user_id", profile.id)
    .not("wallet_address", "is", null);

  const wallets = [...new Set((myMints ?? []).map((p) => p.wallet_address).filter(Boolean))] as string[];
  if (wallets.length === 0) return [];

  const { data } = await admin
    .from("allocation_slices")
    .select("id, buyer_wallet, purchase_id, original_amount, remaining_amount, minted_at, expires_at, swept_at")
    .in("buyer_wallet", wallets)
    .is("swept_at", null)
    .gt("remaining_amount", 0)
    .order("expires_at", { ascending: true });

  return (data ?? []).map((r) => ({
    ...r,
    original_amount: Number(r.original_amount),
    remaining_amount: Number(r.remaining_amount),
  })) as AllocationSlice[];
}

/**
 * Claim + mint. Takes the buyer's wallet, calls mintForPurchase on the
 * LOOP contract, and records the on-chain state:
 *   - purchase.wallet_address, minted_at, mint_tx_hash, status='minted'
 *   - allocation_slices row with 365-day expiry
 */
export async function claimAndMint(
  _prev: { error: string; success: string; txHash?: string },
  formData: FormData
): Promise<{ error: string; success: string; txHash?: string }> {
  const purchaseId = formData.get("purchase_id") as string;
  const walletAddress = (formData.get("wallet_address") as string)?.trim();

  if (!walletAddress) return { error: "Wallet address is required", success: "" };
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return { error: "Invalid Ethereum address", success: "" };
  }

  const profile = await getProfile();
  if (!profile) return { error: "Not authenticated", success: "" };

  const admin = createServiceClient();

  const { data: purchase } = await admin
    .from("token_purchases")
    .select("id, user_id, amount, allocation_amount, minted_at, mint_tx_hash, status")
    .eq("id", purchaseId)
    .single();

  if (!purchase) return { error: "Purchase not found", success: "" };
  if (purchase.user_id && purchase.user_id !== profile.id) {
    return { error: "Not your purchase", success: "" };
  }
  if (purchase.minted_at || purchase.mint_tx_hash) {
    return { error: "Already minted", success: "" };
  }

  if (!isConfigured()) {
    // Chain not configured: fall back to off-chain claim only (v1 behaviour)
    await admin
      .from("token_purchases")
      .update({
        user_id: profile.id,
        wallet_address: walletAddress,
        status: "claimed",
      })
      .eq("id", purchaseId);
    revalidatePath("/claim");
    return {
      error: "",
      success: "Wallet linked. On-chain minting is not configured yet - your tokens are queued.",
    };
  }

  try {
    const amount = Number(purchase.amount);
    if (amount <= 0 || amount % 2 !== 0) {
      return { error: "Purchase amount must be a positive even integer", success: "" };
    }

    const txHash = await mintForPurchaseOnChain(walletAddress as Address, amount);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    await admin
      .from("token_purchases")
      .update({
        user_id: profile.id,
        wallet_address: walletAddress,
        status: "minted",
        minted_at: now.toISOString(),
        mint_tx_hash: txHash,
      })
      .eq("id", purchaseId);

    const allocationAmount = Number(purchase.allocation_amount ?? amount / 2);
    if (allocationAmount > 0) {
      await admin.from("allocation_slices").insert({
        buyer_wallet: walletAddress,
        purchase_id: purchase.id,
        original_amount: allocationAmount,
        remaining_amount: allocationAmount,
        minted_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      });
    }

    revalidatePath("/claim");
    return { error: "", success: `Minted ${amount} LOOP to your wallet.`, txHash };
  } catch (err: any) {
    const message: string = err?.shortMessage || err?.message || "Mint failed";
    return { error: message, success: "" };
  }
}

/**
 * Batch: mint all unclaimed purchases for this user to a single wallet.
 */
export async function claimAllAndMint(
  _prev: { error: string; success: string },
  formData: FormData
): Promise<{ error: string; success: string }> {
  const walletAddress = (formData.get("wallet_address") as string)?.trim();
  if (!walletAddress) return { error: "Wallet address is required", success: "" };
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return { error: "Invalid Ethereum address", success: "" };
  }

  const profile = await getProfile();
  if (!profile) return { error: "Not authenticated", success: "" };

  const admin = createServiceClient();

  const { data: pending } = await admin
    .from("token_purchases")
    .select("id, amount, allocation_amount")
    .eq("user_id", profile.id)
    .is("mint_tx_hash", null)
    .in("status", ["paid", "claimed"]);

  if (!pending || pending.length === 0) {
    return { error: "No purchases to mint", success: "" };
  }

  if (!isConfigured()) {
    await admin
      .from("token_purchases")
      .update({ wallet_address: walletAddress, status: "claimed" })
      .in("id", pending.map((p) => p.id));
    revalidatePath("/claim");
    return {
      error: "",
      success: `Linked wallet on ${pending.length} purchase${pending.length === 1 ? "" : "s"} (on-chain not configured yet).`,
    };
  }

  let succeeded = 0;
  const errors: string[] = [];
  for (const p of pending) {
    try {
      const amount = Number(p.amount);
      if (amount <= 0 || amount % 2 !== 0) {
        errors.push(`Skipped purchase ${p.id.slice(0, 8)}: amount not even`);
        continue;
      }
      const txHash = await mintForPurchaseOnChain(walletAddress as Address, amount);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      await admin
        .from("token_purchases")
        .update({
          wallet_address: walletAddress,
          status: "minted",
          minted_at: now.toISOString(),
          mint_tx_hash: txHash,
        })
        .eq("id", p.id);
      const allocationAmount = Number(p.allocation_amount ?? amount / 2);
      if (allocationAmount > 0) {
        await admin.from("allocation_slices").insert({
          buyer_wallet: walletAddress,
          purchase_id: p.id,
          original_amount: allocationAmount,
          remaining_amount: allocationAmount,
          minted_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        });
      }
      succeeded++;
    } catch (err: any) {
      errors.push(err?.shortMessage || err?.message || "mint failed");
    }
  }

  revalidatePath("/claim");
  if (succeeded === 0) {
    return { error: errors.join("; ") || "All mints failed", success: "" };
  }
  return {
    error: errors.length ? `Minted ${succeeded}/${pending.length}: ${errors.join("; ")}` : "",
    success: `Minted ${succeeded} purchase${succeeded === 1 ? "" : "s"} to ${walletAddress.slice(0, 8)}…`,
  };
}

export type CommunityOption = { id: string; name: string; level: string };

export async function listDirectableCommunities(): Promise<CommunityOption[]> {
  const admin = createServiceClient();
  const { data } = await admin
    .from("communities")
    .select("id, name, level")
    .in("level", ["global", "continental", "national", "city", "local"])
    .order("level")
    .order("name")
    .limit(500);
  return (data ?? []) as CommunityOption[];
}

/**
 * Direct a slice of allocation to a community as either philanthropy or
 * advertising. The community must have a registered on-chain wallet via
 * the LOOP token contract; if not yet registered we surface an error so
 * an admin can set it up via /admin.
 */
export async function directAllocationSlice(
  _prev: { error: string; success: string; txHash?: string },
  formData: FormData
): Promise<{ error: string; success: string; txHash?: string }> {
  const sliceId = formData.get("slice_id") as string;
  const communityId = formData.get("community_id") as string;
  const rawAmount = formData.get("amount") as string;
  const reason = formData.get("reason") as string;
  const amount = Number(rawAmount);

  if (!sliceId || !communityId) return { error: "Missing slice or community", success: "" };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Amount must be positive", success: "" };
  if (!["philanthropy", "advertising"].includes(reason)) return { error: "Invalid reason", success: "" };

  const profile = await getProfile();
  if (!profile) return { error: "Not authenticated", success: "" };

  const admin = createServiceClient();

  const { data: slice } = await admin
    .from("allocation_slices")
    .select("id, buyer_wallet, remaining_amount, swept_at")
    .eq("id", sliceId)
    .single();

  if (!slice) return { error: "Slice not found", success: "" };
  if (slice.swept_at) return { error: "Slice has already been swept", success: "" };
  if (Number(slice.remaining_amount) < amount) {
    return { error: "Amount exceeds remaining balance", success: "" };
  }

  // Check the buyer matches this user
  const { data: purchase } = await admin
    .from("token_purchases")
    .select("user_id")
    .eq("wallet_address", slice.buyer_wallet)
    .eq("user_id", profile.id)
    .limit(1)
    .maybeSingle();
  if (!purchase) return { error: "This allocation is not linked to your account", success: "" };

  if (!isConfigured()) {
    return { error: "On-chain not configured yet", success: "" };
  }

  try {
    // Check community wallet is registered
    const { address } = chainConfig();
    const communityBytes32 = communityIdToBytes32(communityId);
    const client = publicClient();
    const communityWallet = (await client.readContract({
      address,
      abi: LOOP_TOKEN_ABI,
      functionName: "communityWallets",
      args: [communityBytes32],
    })) as string;
    if (!communityWallet || communityWallet === "0x0000000000000000000000000000000000000000") {
      return {
        error:
          "That community's on-chain wallet is not registered yet. Ask a platform admin to set it up.",
        success: "",
      };
    }

    const txHash = await directAllocationForOnChain(
      slice.buyer_wallet as Address,
      communityBytes32,
      amount
    );

    await admin.from("allocation_directions").insert({
      buyer_wallet: slice.buyer_wallet,
      community_id: communityId,
      amount,
      reason,
      tx_hash: txHash,
      actor_user_id: profile.id,
    });

    const newRemaining = Number(slice.remaining_amount) - amount;
    await admin
      .from("allocation_slices")
      .update({ remaining_amount: newRemaining })
      .eq("id", sliceId);

    revalidatePath("/claim");
    return { error: "", success: `Directed ${amount} LOOP to the community.`, txHash };
  } catch (err: any) {
    return { error: err?.shortMessage || err?.message || "Direction failed", success: "" };
  }
}

/**
 * Legacy setDefaultWallet used by old UI: links wallet without minting.
 * Kept for the "chain not configured yet" fallback.
 */
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
  await admin
    .from("token_purchases")
    .update({ wallet_address: walletAddress, status: "claimed" })
    .eq("user_id", profile.id)
    .eq("status", "paid")
    .is("wallet_address", null);

  revalidatePath("/claim");
  return { error: "" };
}
