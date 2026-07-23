"use server";

import { requireAdminSession } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function resolveFlag(
  _prev: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const session = await requireAdminSession();

  if (session.platformRole === "org_manager") {
    return { error: "Org managers cannot resolve flags" };
  }

  const id = formData.get("id") as string;
  const status = formData.get("status") as string;
  const resolutionNote = (formData.get("resolution_note") as string) || null;

  if (!id) return { error: "Missing flag ID" };
  if (status !== "actioned" && status !== "dismissed") {
    return { error: "Invalid status" };
  }

  const admin = createServiceClient();

  const { data: flag } = await admin
    .from("moderation_flags")
    .select("id, white_label_id, status, target_type, target_id")
    .eq("id", id)
    .single();

  if (!flag) return { error: "Flag not found" };
  if (flag.status !== "pending") return { error: "Flag already resolved" };

  if (session.platformRole !== "platform_admin" && session.whiteLabel?.id !== flag.white_label_id) {
    return { error: "Cannot resolve flags for other organizations" };
  }

  const { error } = await admin
    .from("moderation_flags")
    .update({
      status,
      resolved_by: session.userId,
      resolution_note: resolutionNote,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  await admin.from("admin_audit_log").insert({
    white_label_id: flag.white_label_id,
    actor_id: session.userId,
    event_type: status === "actioned" ? "moderation.flag_actioned" : "moderation.flag_dismissed",
    target_type: "moderation_flags",
    target_id: id,
    detail: {
      flag_target_type: flag.target_type,
      flag_target_id: flag.target_id,
      resolution_note: resolutionNote,
    },
  });

  revalidatePath("/moderation");
  return { error: "" };
}
