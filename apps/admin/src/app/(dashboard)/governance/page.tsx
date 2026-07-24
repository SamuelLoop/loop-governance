import { requireAdminSession } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase-server";
import { PageDescription } from "@/components/page-description";
import { GovernanceEditor } from "./governance-editor";

export default async function GovernancePage() {
  const session = await requireAdminSession();
  const admin = createServiceClient();
  const isPlatformAdmin = session.platformRole === "platform_admin";

  let orgsQuery = admin
    .from("white_label_configs")
    .select("id, name")
    .order("name");
  if (!isPlatformAdmin && session.whiteLabel) {
    orgsQuery = orgsQuery.eq("id", session.whiteLabel.id);
  }

  // Communities carry their subject; the white-label they belong to is the
  // source_white_label_id of the community sitting at the root of their path.
  const [{ data: orgs }, { data: allCommunities }, { data: allSettings }] = await Promise.all([
    orgsQuery,
    admin
      .from("communities")
      .select("id, name, subject, level, path, source_white_label_id"),
    admin
      .from("governance_settings")
      .select("scope_type, white_label_id, subject, community_id, settings"),
  ]);

  // Resolve white_label_id for every community via its subject root
  const bySlug = new Map<string, string | null>();
  const rootsBySlug = new Map<string, string | null>();
  for (const c of allCommunities ?? []) {
    const rootSlug = (c.path as string)?.split(".")[0];
    if (rootSlug && c.level === "global" && c.source_white_label_id !== undefined) {
      rootsBySlug.set(rootSlug, c.source_white_label_id ?? null);
    }
    bySlug.set(c.id, (c.path as string)?.split(".")[0] ?? null);
  }

  const communities = (allCommunities ?? [])
    .map((c) => {
      const rootSlug = (c.path as string)?.split(".")[0];
      const wl = rootSlug ? rootsBySlug.get(rootSlug) ?? null : null;
      return {
        id: c.id,
        name: c.name,
        subject: c.subject,
        level: c.level,
        white_label_id: wl,
      };
    })
    .filter((c) =>
      isPlatformAdmin ? true : c.white_label_id === session.whiteLabel?.id
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const subjects = [
    ...new Set((allCommunities ?? []).map((c) => c.subject).filter(Boolean)),
  ].sort() as string[];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Governance Settings</h1>
        <p className="text-sm text-muted-foreground">
          Cascading rules that shape how communities elect leaders, delegate
          votes and spend from treasuries
        </p>
      </div>

      <PageDescription
        purpose="Settings that control how governance works: leadership group size, delegation depth and decay, proposal spending caps, default visibility. Each level (Platform, White-label, Subject, Community) can set values that any lower level inherits and can override."
        whenToUse="Set Platform defaults once so every new community starts with sensible rules. Use White-label to differ per organization, Subject when a specific theme (say technology) needs different rules within an organization, and Community only to override a single community. Leave a field blank at any level to inherit from above."
      />

      <GovernanceEditor
        orgs={orgs ?? []}
        subjects={subjects}
        communities={communities}
        allSettings={
          (allSettings ?? []).map((r) => ({
            scope_type: r.scope_type,
            white_label_id: r.white_label_id,
            subject: r.subject,
            community_id: r.community_id,
            settings: (r.settings ?? {}) as Record<string, unknown>,
          }))
        }
        canEditPlatform={isPlatformAdmin}
        isPlatformAdmin={isPlatformAdmin}
        defaultOrgId={session.whiteLabel?.id ?? null}
      />
    </div>
  );
}
