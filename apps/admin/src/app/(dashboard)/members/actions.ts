"use server";

import { requireAdminSession } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function updatePlatformRole(
  _prev: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const session = await requireAdminSession();
  const targetUserId = formData.get("user_id") as string;
  const newRole = formData.get("role") as string;

  if (!targetUserId || !newRole) return { error: "Missing fields" };

  const validRoles = ["member", "org_admin", "org_manager"];
  if (session.platformRole === "platform_admin") {
    validRoles.push("platform_admin");
  }
  if (!validRoles.includes(newRole)) return { error: "Invalid role" };

  if (newRole === "platform_admin" && session.platformRole !== "platform_admin") {
    return { error: "Only platform admins can grant platform admin" };
  }

  if (targetUserId === session.userId && newRole !== session.platformRole) {
    return { error: "Cannot change your own role" };
  }

  const admin = createServiceClient();

  const { error } = await admin
    .from("users")
    .update({ platform_role: newRole })
    .eq("id", targetUserId);

  if (error) return { error: error.message };

  if (newRole === "org_admin" || newRole === "org_manager") {
    const whLabelId = formData.get("white_label_id") as string;
    if (whLabelId) {
      await admin.from("admin_assignments").upsert(
        {
          user_id: targetUserId,
          white_label_id: whLabelId,
          role: newRole,
          granted_by: session.userId,
        },
        { onConflict: "user_id,white_label_id" }
      );
    }
  }

  await admin.from("admin_audit_log").insert({
    white_label_id: session.whiteLabel?.id ?? formData.get("white_label_id") ?? null,
    actor_id: session.userId,
    event_type: "member.role_changed",
    target_type: "user",
    target_id: targetUserId,
    detail: { new_role: newRole, previous_role: formData.get("previous_role") },
  });

  revalidatePath("/members");
  return { error: "" };
}

export async function revokeAdminAssignment(
  _prev: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const session = await requireAdminSession();
  const assignmentId = formData.get("assignment_id") as string;

  if (!assignmentId) return { error: "Missing assignment ID" };

  if (session.platformRole !== "platform_admin" && session.platformRole !== "org_admin") {
    return { error: "Insufficient permissions" };
  }

  const admin = createServiceClient();

  const { data: assignment } = await admin
    .from("admin_assignments")
    .select("user_id, white_label_id, role")
    .eq("id", assignmentId)
    .single();

  if (!assignment) return { error: "Assignment not found" };

  if (session.platformRole !== "platform_admin" &&
      session.whiteLabel?.id !== assignment.white_label_id) {
    return { error: "Cannot revoke assignments for other organizations" };
  }

  const { error } = await admin
    .from("admin_assignments")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", assignmentId);

  if (error) return { error: error.message };

  await admin.from("users")
    .update({ platform_role: "member" })
    .eq("id", assignment.user_id);

  await admin.from("admin_audit_log").insert({
    white_label_id: assignment.white_label_id,
    actor_id: session.userId,
    event_type: "member.assignment_revoked",
    target_type: "admin_assignment",
    target_id: assignmentId,
    detail: { user_id: assignment.user_id, role: assignment.role },
  });

  revalidatePath("/members");
  return { error: "" };
}
