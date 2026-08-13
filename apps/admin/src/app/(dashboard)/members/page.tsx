import { requireAdminSession } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase-server";
import { MembersTable } from "./members-table";
import { PageDescription } from "@/components/page-description";
import { Glass } from "@loop/ui";

export default async function MembersPage() {
  const session = await requireAdminSession();
  const admin = createServiceClient();
  const isPlatformAdmin = session.platformRole === "platform_admin";

  let usersQuery = admin
    .from("users")
    .select("id, display_name, email, platform_role, avatar_url, source_white_label_id, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (!isPlatformAdmin && session.whiteLabel) {
    usersQuery = usersQuery.eq("source_white_label_id", session.whiteLabel.id);
  }

  const [{ data: users }, { data: assignments }, { data: orgs }, { data: wlConfigs }] = await Promise.all([
    usersQuery,
    admin
      .from("admin_assignments")
      .select("id, user_id, white_label_id, role, revoked_at, white_label_configs(name)")
      .is("revoked_at", null),
    admin
      .from("white_label_configs")
      .select("id, name")
      .order("name"),
    admin
      .from("white_label_configs")
      .select("id, name"),
  ]);

  const assignmentMap = new Map<string, { id: string; role: string; wlName: string }>();
  for (const a of assignments ?? []) {
    const wlName = (a as any).white_label_configs?.name ?? "Unknown";
    assignmentMap.set(a.user_id, { id: a.id, role: a.role, wlName });
  }

  const wlNameMap = new Map<string, string>();
  for (const wl of wlConfigs ?? []) {
    wlNameMap.set(wl.id, wl.name);
  }

  const members = (users ?? []).map((u) => {
    const assignment = assignmentMap.get(u.id);
    return {
      id: u.id,
      display_name: u.display_name,
      email: u.email,
      platform_role: u.platform_role ?? "member",
      avatar_url: u.avatar_url,
      source_white_label_id: u.source_white_label_id,
      source_org_name: u.source_white_label_id ? wlNameMap.get(u.source_white_label_id) ?? null : null,
      created_at: u.created_at,
      assignment_id: assignment?.id ?? null,
      assignment_role: assignment?.role ?? null,
      assignment_wl_name: assignment?.wlName ?? null,
    };
  });

  const roleCounts = {
    total: members.length,
    platform_admin: members.filter((m) => m.platform_role === "platform_admin").length,
    org_admin: members.filter((m) => m.platform_role === "org_admin").length,
    org_manager: members.filter((m) => m.platform_role === "org_manager").length,
    member: members.filter((m) => m.platform_role === "member").length,
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-h1 font-bold tracking-tight">Members</h1>
        <p className="text-body text-text-secondary">
          {isPlatformAdmin
            ? "Manage users across all organizations"
            : `Manage users for ${session.whiteLabel?.name ?? "your organization"}`}
        </p>
      </div>

      <PageDescription
        purpose="The full list of users on the platform, with each person's role: platform_admin (global), org_admin (per white-label organization), org_manager (read-only per organization), or member. Roles can be changed or revoked here."
        whenToUse="Use this page to onboard new admins, adjust an existing person's permissions, or revoke access when someone leaves the team. Anyone who signs up starts as a member; promote them here to give them access to this admin console."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Glass space="admin" className="p-3">
          <p className="text-caption text-text-secondary">Total</p>
          <p className="font-mono text-data-lg font-bold tabular-nums text-text-primary">{roleCounts.total}</p>
        </Glass>
        <Glass space="admin" className="p-3">
          <p className="text-caption text-error">Platform Admins</p>
          <p className="font-mono text-data-lg font-bold tabular-nums text-error">{roleCounts.platform_admin}</p>
        </Glass>
        <Glass space="admin" className="p-3">
          <p className="text-caption text-warning">Org Admins</p>
          <p className="font-mono text-data-lg font-bold tabular-nums text-warning">{roleCounts.org_admin}</p>
        </Glass>
        <Glass space="admin" className="p-3">
          <p className="text-caption text-text-secondary">Org Managers</p>
          <p className="font-mono text-data-lg font-bold tabular-nums text-text-primary">{roleCounts.org_manager}</p>
        </Glass>
        <Glass space="admin" className="p-3">
          <p className="text-caption text-text-secondary">Members</p>
          <p className="font-mono text-data-lg font-bold tabular-nums text-text-primary">{roleCounts.member}</p>
        </Glass>
      </div>

      <MembersTable
        members={members}
        orgs={orgs ?? []}
        currentUserId={session.userId}
        viewerRole={session.platformRole}
      />
    </div>
  );
}
