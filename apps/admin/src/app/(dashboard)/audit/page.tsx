import { requireAdminSession } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase-server";
import { AuditTable } from "./audit-table";

export default async function AuditPage() {
  const session = await requireAdminSession();
  const admin = createServiceClient();
  const isPlatformAdmin = session.platformRole === "platform_admin";

  let eventsQuery = admin
    .from("admin_audit_log")
    .select("id, white_label_id, actor_id, event_type, target_type, target_id, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(300);

  if (!isPlatformAdmin && session.whiteLabel) {
    eventsQuery = eventsQuery.eq("white_label_id", session.whiteLabel.id);
  }

  const [{ data: rawEvents }, { data: orgs }] = await Promise.all([
    eventsQuery,
    admin.from("white_label_configs").select("id, name"),
  ]);

  const actorIds = [...new Set((rawEvents ?? []).map((e) => e.actor_id))];
  const { data: actors } = actorIds.length
    ? await admin.from("users").select("id, display_name").in("id", actorIds)
    : { data: [] };

  const actorNames = new Map((actors ?? []).map((u) => [u.id, u.display_name]));
  const orgNames = new Map((orgs ?? []).map((o) => [o.id, o.name]));

  const events = (rawEvents ?? []).map((e) => ({
    id: e.id,
    actor_name: actorNames.get(e.actor_id) ?? null,
    event_type: e.event_type,
    target_type: e.target_type,
    target_id: e.target_id,
    detail: e.detail,
    created_at: e.created_at,
    org_name: orgNames.get(e.white_label_id) ?? null,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Append-only trail of admin actions ({events.length} most recent events)
        </p>
      </div>

      <AuditTable events={events} showOrg={isPlatformAdmin} />
    </div>
  );
}
