import { requireAdminSession } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase-server";
import { AllocationsEditor } from "./allocations-editor";
import { PageDescription } from "@/components/page-description";

export default async function AllocationsPage() {
  const session = await requireAdminSession();
  const admin = createServiceClient();
  const isPlatformAdmin = session.platformRole === "platform_admin";
  const canEdit = session.platformRole !== "org_manager";

  const [{ data: allocations }, { data: orgs }, { data: subjectRows }] = await Promise.all([
    admin
      .from("subject_allocations")
      .select("id, white_label_id, subject, allocation_pct, proposal_cap_cents, updated_by, updated_at")
      .order("subject"),
    admin
      .from("white_label_configs")
      .select("id, name")
      .order("name"),
    admin
      .from("communities")
      .select("subject")
      .not("subject", "is", null),
  ]);

  const subjects = [...new Set((subjectRows ?? []).map((r: any) => r.subject as string))].sort();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Subject Allocations</h1>
        <p className="text-sm text-muted-foreground">
          Configure how treasury funds are split across subjects
        </p>
      </div>

      <PageDescription
        purpose="Sets how each organization's treasury is split across the different subjects (governance, ecology, economics, technology and so on). Each subject can also have its own proposal spending cap so no single proposal can drain more than intended."
        whenToUse="Update these values when an organization changes strategy: new subject priorities for the coming period, a tighter cap after a governance incident, or reallocating from a subject that has fallen quiet. Total allocation should sum to 100%; the header shows over- or under-allocation live."
      />

      <AllocationsEditor
        allocations={allocations ?? []}
        orgs={orgs ?? []}
        subjects={subjects}
        isPlatformAdmin={isPlatformAdmin}
        defaultOrgId={session.whiteLabel?.id ?? null}
        canEdit={canEdit}
      />
    </div>
  );
}
