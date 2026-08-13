import { createServiceClient } from "@/lib/supabase-server";
import { getSubjectCommunityIds } from "@/lib/subject";
import {
  Glass,
  StatusChip,
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
  type StatusChipVariant,
} from "@loop/ui";

// Community-level role (admin/quorum/member) is distinct from admin's
// platform-level role field — admin (community admin) is the one
// genuinely high-stakes local role, so it's the only one that gets
// `warning`; quorum ("leader") is a real status but not a severity.
const ROLE_VARIANT: Record<string, StatusChipVariant> = {
  admin: "warning",
};

export default async function MembersPage() {
  const admin = createServiceClient();
  const { communityIds } = await getSubjectCommunityIds();

  const { data: memberships } = await admin
    .from("community_memberships")
    .select(
      `id, role, joined_at,
      users!community_memberships_user_id_fkey(id, display_name, email, location_name, subject_expertise),
      communities!community_memberships_community_id_fkey(name, slug)`
    )
    .in("community_id", communityIds.length > 0 ? communityIds : ["none"])
    .order("joined_at", { ascending: false });

  return (
    <div>
      <h1 className="mb-6 text-h1 font-bold tracking-tight text-text-primary">Members</h1>

      {memberships && memberships.length > 0 ? (
        <DataTable>
          <DataTableHeader>
            <tr>
              <DataTableHead>Name</DataTableHead>
              <DataTableHead>Email</DataTableHead>
              <DataTableHead>Community</DataTableHead>
              <DataTableHead>Role</DataTableHead>
              <DataTableHead>Location</DataTableHead>
              <DataTableHead>Joined</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {memberships.map((m: any) => (
              <DataTableRow key={m.id}>
                <DataTableCell className="font-medium">
                  {m.users?.display_name}
                </DataTableCell>
                <DataTableCell className="text-text-secondary">
                  {m.users?.email}
                </DataTableCell>
                <DataTableCell className="text-text-secondary">
                  {m.communities?.name}
                </DataTableCell>
                <DataTableCell>
                  <StatusChip variant={ROLE_VARIANT[m.role] ?? "neutral"}>
                    {m.role === "quorum" ? "leader" : m.role}
                  </StatusChip>
                </DataTableCell>
                <DataTableCell className="text-text-secondary">
                  {m.users?.location_name ?? "-"}
                </DataTableCell>
                <DataTableCell className="text-text-secondary">
                  {new Date(m.joined_at).toLocaleDateString()}
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      ) : (
        <Glass className="py-10 text-center text-body text-text-secondary">
          No members yet.
        </Glass>
      )}
    </div>
  );
}
