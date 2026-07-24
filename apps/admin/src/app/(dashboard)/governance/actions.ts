"use server";

import { requireAdminSession } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase-server";
import { SETTING_FIELDS, parseFieldValue, type Scope } from "@/lib/governance-settings";
import { revalidatePath } from "next/cache";

const COMMUNITY_COLUMN_MAP: Record<string, string> = {
  quorum_size: "quorum_size",
  quorum_threshold_pct: "quorum_threshold_pct",
  dunbar_limit: "dunbar_limit",
  max_delegation_depth: "max_delegation_depth",
  delegation_decay: "delegation_decay",
  proposal_cap_cents: "proposal_cap_cents",
  default_visibility: "visibility",
};

type SaveState = { error: string; success: string };

export async function saveGovernanceSettings(
  _prev: SaveState,
  formData: FormData
): Promise<SaveState> {
  const session = await requireAdminSession();
  if (session.platformRole === "org_manager") {
    return { error: "Org managers cannot modify settings", success: "" };
  }

  const scopeJson = formData.get("scope") as string;
  let scope: Scope;
  try {
    scope = JSON.parse(scopeJson);
  } catch {
    return { error: "Invalid scope", success: "" };
  }

  if (scope.type === "platform" && session.platformRole !== "platform_admin") {
    return { error: "Only platform admins can edit platform defaults", success: "" };
  }
  if (
    (scope.type === "white_label" || scope.type === "subject") &&
    session.platformRole !== "platform_admin" &&
    session.whiteLabel?.id !== (scope as any).white_label_id
  ) {
    return { error: "Cannot edit settings for another organization", success: "" };
  }

  const settings: Record<string, unknown> = {};
  for (const field of SETTING_FIELDS) {
    const raw = formData.get(field.key);
    if (typeof raw === "string" && raw.trim() !== "") {
      const parsed = parseFieldValue(field, raw);
      if (parsed !== null) settings[field.key] = parsed;
    }
  }

  const admin = createServiceClient();

  const row: Record<string, any> = {
    scope_type: scope.type,
    white_label_id: null,
    subject: null,
    community_id: null,
    settings,
    updated_by: session.userId,
    updated_at: new Date().toISOString(),
  };

  let conflictTarget = "";
  let existingQuery = admin.from("governance_settings").select("id").eq("scope_type", scope.type);

  if (scope.type === "white_label") {
    row.white_label_id = scope.white_label_id;
    existingQuery = existingQuery.eq("white_label_id", scope.white_label_id);
    conflictTarget = scope.white_label_id;
  } else if (scope.type === "subject") {
    row.white_label_id = scope.white_label_id;
    row.subject = scope.subject;
    existingQuery = existingQuery.eq("white_label_id", scope.white_label_id).eq("subject", scope.subject);
    conflictTarget = `${scope.white_label_id}/${scope.subject}`;
  } else if (scope.type === "community") {
    row.community_id = scope.community_id;
    existingQuery = existingQuery.eq("community_id", scope.community_id);
    conflictTarget = scope.community_id;
  } else {
    existingQuery = existingQuery.is("white_label_id", null).is("community_id", null);
    conflictTarget = "platform";
  }

  const { data: existing } = await existingQuery.maybeSingle();

  let upsertError: string | null = null;
  if (existing) {
    const { error } = await admin
      .from("governance_settings")
      .update({ settings, updated_by: session.userId, updated_at: row.updated_at })
      .eq("id", existing.id);
    upsertError = error?.message ?? null;
  } else {
    const { error } = await admin.from("governance_settings").insert(row);
    upsertError = error?.message ?? null;
  }

  if (upsertError) return { error: upsertError, success: "" };

  // Community-scope edits also update the legacy columns so runtime code
  // continues to work without needing the resolve function.
  if (scope.type === "community") {
    const communityUpdate: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(settings)) {
      const col = COMMUNITY_COLUMN_MAP[key];
      if (col) communityUpdate[col] = value;
    }
    if (Object.keys(communityUpdate).length > 0) {
      await admin
        .from("communities")
        .update(communityUpdate)
        .eq("id", scope.community_id);
    }
  }

  // Resolve the white_label to attribute this audit entry to.
  // - platform scope: no org (null); it's a global change.
  // - white_label / subject scope: the org named by the scope.
  // - community scope: the org that owns the community's subject root.
  let wlForAudit: string | null = null;
  if (scope.type === "white_label" || scope.type === "subject") {
    wlForAudit = (scope as any).white_label_id;
  } else if (scope.type === "community") {
    const { data: community } = await admin
      .from("communities")
      .select("path")
      .eq("id", scope.community_id)
      .single();
    const rootSlug = (community?.path as string | undefined)?.split(".")[0];
    if (rootSlug) {
      const { data: root } = await admin
        .from("communities")
        .select("source_white_label_id")
        .eq("slug", rootSlug)
        .eq("level", "global")
        .maybeSingle();
      wlForAudit = root?.source_white_label_id ?? null;
    }
  }

  await admin.from("admin_audit_log").insert({
    white_label_id: wlForAudit,
    actor_id: session.userId,
    event_type: "settings.governance_updated",
    target_type: "governance_settings",
    target_id: conflictTarget,
    detail: { scope_type: scope.type, settings },
  });

  revalidatePath("/governance");
  return { error: "", success: "Settings saved" };
}
