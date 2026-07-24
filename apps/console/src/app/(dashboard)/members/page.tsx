import { createServiceClient } from "@/lib/supabase-server";
import { getSubjectCommunityIds } from "@/lib/subject";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Members</h1>

      {memberships && memberships.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Community</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberships.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    {m.users?.display_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.users?.email}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.communities?.name}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        m.role === "admin"
                          ? "default"
                          : m.role === "quorum"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {m.role === "quorum" ? "leader" : m.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.users?.location_name ?? "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(m.joined_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card>
          <div className="py-10 text-center text-muted-foreground">
            No members yet.
          </div>
        </Card>
      )}
    </div>
  );
}
