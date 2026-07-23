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

  const fields = {
    tokens_per_action: parseFloat(formData.get("tokens_per_action") as string),
    weekly_cap: parseInt(formData.get("weekly_cap") as string),
    streak_multiplier: parseFloat(formData.get("streak_multiplier") as string),
    streak_threshold_weeks: parseInt(formData.get("streak_threshold_weeks") as string),
    streak_bonus: parseFloat(formData.get("streak_bonus") as string),
    delegation_reward: parseFloat(formData.get("delegation_reward") as string),
  };

  for (const [k, v] of Object.entries(fields)) {
    if (isNaN(v) || v < 0) return { error: `Invalid value for ${k.replace(/_/g, " ")}`, success: "" };
  }

  const admin = createServiceClient();

  const { error } = await admin.from("loyalty_config").upsert(
    {
      white_label_id: whiteLabelId,
      ...fields,
      updated_by: session.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "white_label_id" }
  );

  if (error) return { error: error.message, success: "" };

  await admin.from("admin_audit_log").insert({
    white_label_id: whiteLabelId,
    actor_id: session.userId,
    event_type: "settings.loyalty_updated",
    target_type: "loyalty_config",
    target_id: whiteLabelId,
    detail: fields,
  });

  revalidatePath("/settings");
  return { error: "", success: "Loyalty settings saved" };
}
