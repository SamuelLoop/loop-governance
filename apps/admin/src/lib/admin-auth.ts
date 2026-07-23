"use server";

import { createClient, createServiceClient } from "./supabase-server";
import { redirect } from "next/navigation";

export type AdminRole = "platform_admin" | "org_admin" | "org_manager";

export type AdminSession = {
  userId: string;
  authId: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  platformRole: AdminRole;
  whiteLabel: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

const ADMIN_ROLES: AdminRole[] = ["platform_admin", "org_admin", "org_manager"];

export async function requireAdminSession(): Promise<AdminSession> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createServiceClient();

  const { data: profile } = await admin
    .from("users")
    .select("id, display_name, email, avatar_url, platform_role, source_white_label_id")
    .eq("auth_id", user.id)
    .single();

  if (!profile || !ADMIN_ROLES.includes(profile.platform_role as AdminRole)) {
    redirect("/login?error=admin_required");
  }

  let whiteLabel = null;
  if (profile.platform_role !== "platform_admin" && profile.source_white_label_id) {
    const { data: wl } = await admin
      .from("white_label_configs")
      .select("id, name, slug")
      .eq("id", profile.source_white_label_id)
      .single();
    whiteLabel = wl;
  } else if (profile.platform_role !== "platform_admin") {
    const { data: assignment } = await admin
      .from("admin_assignments")
      .select("white_label_id")
      .eq("user_id", profile.id)
      .is("revoked_at", null)
      .limit(1)
      .single();

    if (assignment) {
      const { data: wl } = await admin
        .from("white_label_configs")
        .select("id, name, slug")
        .eq("id", assignment.white_label_id)
        .single();
      whiteLabel = wl;
    }
  }

  return {
    userId: profile.id,
    authId: user.id,
    displayName: profile.display_name,
    email: profile.email,
    avatarUrl: profile.avatar_url,
    platformRole: profile.platform_role as AdminRole,
    whiteLabel,
  };
}
