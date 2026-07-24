"use server";

import { requireAdminSession } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function updateOrgSettings(
  _prev: { error: string; success: string },
  formData: FormData
): Promise<{ error: string; success: string }> {
  const session = await requireAdminSession();

  if (session.platformRole === "org_manager") {
    return { error: "Org managers cannot modify settings", success: "" };
  }

  const id = formData.get("id") as string;
  const brandName = (formData.get("brand_name") as string)?.trim();
  const brandColor = (formData.get("brand_color") as string)?.trim();
  const brandLogoUrl = (formData.get("brand_logo_url") as string)?.trim() || null;
  const sharedAuth = formData.get("shared_auth") === "on";

  if (!id || !brandName) return { error: "Brand name is required", success: "" };
  if (brandColor && !/^#[0-9a-fA-F]{6}$/.test(brandColor)) {
    return { error: "Brand color must be a hex value like #f59e0b", success: "" };
  }

  if (session.platformRole !== "platform_admin" && session.whiteLabel?.id !== id) {
    return { error: "Cannot modify settings for other organizations", success: "" };
  }

  const admin = createServiceClient();

  const { error } = await admin
    .from("white_label_configs")
    .update({
      brand_name: brandName,
      brand_color: brandColor || "#f59e0b",
      brand_logo_url: brandLogoUrl,
      shared_auth: sharedAuth,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message, success: "" };

  await admin.from("admin_audit_log").insert({
    white_label_id: id,
    actor_id: session.userId,
    event_type: "settings.org_updated",
    target_type: "white_label_configs",
    target_id: id,
    detail: { brand_name: brandName, brand_color: brandColor, shared_auth: sharedAuth },
  });

  revalidatePath("/settings");
  return { error: "", success: "Settings saved" };
}

export async function updateLoyaltyConfig(
  _prev: { error: string; success: string },
  formData: FormData
): Promise<{ error: string; success: string }> {
  const session = await requireAdminSession();

  if (session.platformRole === "org_manager") {
    return { error: "Org managers cannot modify loyalty settings", success: "" };
  }

  const whiteLabelId = formData.get("white_label_id") as string;
  if (!whiteLabelId) return { error: "Missing organization", success: "" };

  if (session.platformRole !== "platform_admin" && session.whiteLabel?.id !== whiteLabelId) {
    return { error: "Cannot modify loyalty settings for other organizations", success: "" };
  }

  // Write to the shared governance_settings cascade so runtime code
  // (award_loyalty) and the Governance page see the same source of truth.
  // Keeps loyalty_config in sync too for any legacy consumer.
  const parsedNum = (name: string) => {
    const raw = formData.get(name);
    if (typeof raw !== "string" || raw.trim() === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : NaN;
  };

  const values: Record<string, number> = {};
  const inputs: Record<string, string> = {
    loyalty_tokens_per_vote: "tokens_per_vote",
    loyalty_tokens_per_proposal: "tokens_per_proposal",
    loyalty_tokens_per_delegation: "tokens_per_delegation",
    loyalty_weekly_cap: "weekly_cap",
    loyalty_streak_multiplier: "streak_multiplier",
    loyalty_streak_threshold_weeks: "streak_threshold_weeks",
    loyalty_streak_bonus: "streak_bonus",
    loyalty_to_loop_rate: "conversion_rate",
  };
  for (const [cascadeKey, formKey] of Object.entries(inputs)) {
    const v = parsedNum(formKey);
    if (v === null) continue;
    if (Number.isNaN(v)) {
      return { error: `Invalid value for ${formKey.replace(/_/g, " ")}`, success: "" };
    }
    values[cascadeKey] = v;
  }
  // Boolean toggles
  const toggles: Record<string, string> = {
    loyalty_award_votes: "award_votes",
    loyalty_award_proposals: "award_proposals",
    loyalty_award_delegations: "award_delegations",
  };
  for (const [cascadeKey, formKey] of Object.entries(toggles)) {
    const raw = formData.get(formKey);
    if (raw === null) continue;
    values[cascadeKey] = raw === "on" || raw === "true" ? 1 : 0;
  }

  const admin = createServiceClient();

  // Load current cascade row for this white_label so we merge, not replace
  const { data: existing } = await admin
    .from("governance_settings")
    .select("id, settings")
    .eq("scope_type", "white_label")
    .eq("white_label_id", whiteLabelId)
    .maybeSingle();

  const mergedSettings: Record<string, unknown> = {
    ...((existing?.settings as Record<string, unknown>) ?? {}),
  };
  for (const [k, v] of Object.entries(values)) {
    // Normalise the 0/1 we used for booleans back to boolean in JSONB
    if (k.startsWith("loyalty_award_")) {
      mergedSettings[k] = v === 1;
    } else {
      mergedSettings[k] = v;
    }
  }

  const nowIso = new Date().toISOString();
  let saveError: string | null = null;
  if (existing) {
    const { error } = await admin
      .from("governance_settings")
      .update({ settings: mergedSettings, updated_by: session.userId, updated_at: nowIso })
      .eq("id", existing.id);
    saveError = error?.message ?? null;
  } else {
    const { error } = await admin.from("governance_settings").insert({
      scope_type: "white_label",
      white_label_id: whiteLabelId,
      settings: mergedSettings,
      updated_by: session.userId,
      updated_at: nowIso,
    });
    saveError = error?.message ?? null;
  }
  if (saveError) return { error: saveError, success: "" };

  await admin.from("admin_audit_log").insert({
    white_label_id: whiteLabelId,
    actor_id: session.userId,
    event_type: "settings.loyalty_updated",
    target_type: "governance_settings",
    target_id: whiteLabelId,
    detail: { scope_type: "white_label", settings: values },
  });

  revalidatePath("/settings");
  revalidatePath("/governance");
  return { error: "", success: "Loyalty settings saved" };
}
