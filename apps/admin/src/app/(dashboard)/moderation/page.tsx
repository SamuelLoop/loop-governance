import { requireAdminSession } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase-server";
import { FlagQueue } from "./flag-queue";

export default async function ModerationPage() {
  const session = await requireAdminSession();
  const admin = createServiceClient();
  const isPlatformAdmin = session.platformRole === "platform_admin";

  let flagsQuery = admin
    .from("moderation_flags")
    .select(`
      id, white_label_id, reporter_id, target_type, target_id, reason,
      status, resolved_by, resolution_note, resolved_at, created_at
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  if (!isPlatformAdmin && session.whiteLabel) {
    flagsQuery = flagsQuery.eq("white_label_id", session.whiteLabel.id);
  }

  const [{ data: rawFlags }, { data: orgs }] = await Promise.all([
    flagsQuery,
    admin.from("white_label_configs").select("id, name"),
  ]);

  const userIds = [
    ...new Set(
      (rawFlags ?? []).flatMap((f) => [f.reporter_id, f.resolved_by].filter(Boolean) as string[])
    ),
  ];

  const { data: users } = userIds.length
    ? await admin.from("users").select("id, display_name").in("id", userIds)
    : { data: [] };

  const userNames = new Map((users ?? []).map((u) => [u.id, u.display_name]));
  const orgNames = new Map((orgs ?? []).map((o) => [o.id, o.name]));

  const flags = (rawFlags ?? []).map((f) => ({
    id: f.id,
    white_label_id: f.white_label_id,
    reporter_name: userNames.get(f.reporter_id) ?? null,
    target_type: f.target_type,
    target_id: f.target_id,
    reason: f.reason,
    status: f.status,
    resolved_by_name: f.resolved_by ? userNames.get(f.resolved_by) ?? null : null,
    resolution_note: f.resolution_note,
    resolved_at: f.resolved_at,
    created_at: f.created_at,
    org_name: orgNames.get(f.white_label_id) ?? null,
  }));

  const pendingCount = flags.filter((f) => f.status === "pending").length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Moderation</h1>
        <p className="text-sm text-muted-foreground">
          {pendingCount} pending {pendingCount === 1 ? "flag" : "flags"} awaiting review
        </p>
      </div>

      <FlagQueue
        flags={flags}
        canResolve={session.platformRole !== "org_manager"}
        showOrg={isPlatformAdmin}
      />
    </div>
  );
}
