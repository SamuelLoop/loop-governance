import { requireAdminSession } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase-server";
import { MembersTable } from "./members-table";

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
        <h1 className="text-2xl font-bold tracking-tight">Members</h1>
        <p className="text-sm text-muted-foreground">
          {isPlatformAdmin
            ? "Manage users across all organizations"
            : `Manage users for ${session.whiteLabel?.name ?? "your organization"}`}
        </p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-xl font-bold tabular-nums">{roleCounts.total}</p>
        </div>
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
          <p className="text-xs text-destructive">Platform Admins</p>
          <p className="text-xl font-bold tabular-nums text-destructive">{roleCounts.platform_admin}</p>
        </div>
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-xs text-amber-400">Org Admins</p>
          <p className="text-xl font-bold tabular-nums text-amber-400">{roleCounts.org_admin}</p>
        </div>
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
          <p className="text-xs text-blue-400">Org Managers</p>
          <p className="text-xl font-bold tabular-nums text-blue-400">{roleCounts.org_manager}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Members</p>
          <p className="text-xl font-bold tabular-nums">{roleCounts.member}</p>
        </div>
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
