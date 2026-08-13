import { requireAdminSession } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase-server";
import { PageDescription } from "@/components/page-description";
import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
  StatusChip,
} from "@loop/ui";

export default async function CommunitiesPage() {
  const session = await requireAdminSession();
  const admin = createServiceClient();

  const { data: communities } = await admin
    .from("communities")
    .select(`
      id, name, slug, subject, level, path,
      quorum_size, dunbar_limit, proposal_cap_cents,
      visibility, created_at
    `)
    .order("subject")
    .order("level")
    .order("name");

  const { data: memberCounts } = await admin
    .from("community_memberships")
    .select("community_id")
    .then((r) => {
      const counts = new Map<string, number>();
      for (const m of r.data ?? []) {
        counts.set(m.community_id, (counts.get(m.community_id) ?? 0) + 1);
      }
      return { data: counts };
    });

  const subjects = [...new Set((communities ?? []).map((c) => c.subject))].sort();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-h1 font-bold tracking-tight">Communities</h1>
        <p className="text-body text-text-secondary">
          {communities?.length ?? 0} communities across {subjects.length} subjects
        </p>
      </div>

      <PageDescription
        purpose="A read-only inventory of every community on the platform, grouped by subject and indented by hierarchy depth. Shows the leadership group size, per-community proposal spending cap and visibility of each."
        whenToUse="Reference this page when investigating a report, sizing a new campaign, or verifying that a community's spending cap or visibility is set correctly. Community-level edits still happen inside each community in the member console; this view is where you get the big picture."
      />

      {subjects.map((subject) => {
        const subjectCommunities = (communities ?? []).filter((c) => c.subject === subject);
        return (
          <div key={subject} className="mb-8">
            <h2 className="mb-3 text-h2 font-bold capitalize">{subject}</h2>
            <DataTable>
              <DataTableHeader>
                <tr>
                  <DataTableHead>Name</DataTableHead>
                  <DataTableHead>Level</DataTableHead>
                  <DataTableHead align="right" className="hidden md:table-cell">
                    Members
                  </DataTableHead>
                  <DataTableHead align="right" className="hidden md:table-cell">
                    Quorum
                  </DataTableHead>
                  <DataTableHead align="right" className="hidden lg:table-cell">
                    Proposal Cap
                  </DataTableHead>
                  <DataTableHead className="hidden lg:table-cell">Visibility</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {subjectCommunities.map((c) => {
                  const members = memberCounts?.get(c.id) ?? 0;
                  const depth = (c.path?.split(".").length ?? 1) - 1;
                  return (
                    <DataTableRow key={c.id}>
                      <DataTableCell>
                        <div style={{ paddingLeft: `${depth * 16}px` }}>
                          <p className="font-medium">{c.name}</p>
                          <p className="text-caption text-text-secondary">{c.slug}</p>
                        </div>
                      </DataTableCell>
                      <DataTableCell>
                        <StatusChip variant={c.level === "global" ? "warning" : "neutral"}>
                          {c.level}
                        </StatusChip>
                      </DataTableCell>
                      <DataTableCell numeric align="right" className="hidden md:table-cell">
                        {members}
                      </DataTableCell>
                      <DataTableCell numeric align="right" className="hidden md:table-cell">
                        {c.quorum_size}
                      </DataTableCell>
                      <DataTableCell numeric align="right" className="hidden lg:table-cell">
                        {c.proposal_cap_cents != null ? (
                          `$${(c.proposal_cap_cents / 100).toLocaleString()}`
                        ) : (
                          <span className="text-text-muted">None</span>
                        )}
                      </DataTableCell>
                      <DataTableCell className="hidden lg:table-cell">
                        <StatusChip variant={c.visibility === "public" ? "success" : "neutral"}>
                          {c.visibility ?? "public"}
                        </StatusChip>
                      </DataTableCell>
                    </DataTableRow>
                  );
                })}
              </DataTableBody>
            </DataTable>
          </div>
        );
      })}
    </div>
  );
}
