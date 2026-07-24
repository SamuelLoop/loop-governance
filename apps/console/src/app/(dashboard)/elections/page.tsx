import { createClient, createServiceClient } from "@/lib/supabase-server";
import { getSubjectCommunityIds } from "@/lib/subject";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateElectionForm } from "./create-form";
import { AdvanceButton } from "./advance-button";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  nominations: "default",
  voting: "secondary",
  completed: "outline",
  cancelled: "destructive",
};

export default async function ElectionsPage() {
  const supabase = await createClient();
  const admin = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await admin
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  const { communityIds, isPlatformAdmin } = await getSubjectCommunityIds();

  const { data: elections } = await admin
    .from("elections")
    .select(
      `id, title, status, seats, term_days,
      nominations_open, nominations_close, voting_open, voting_close, created_at,
      communities!elections_community_id_fkey(name, slug, subject)`
    )
    .in("community_id", communityIds.length > 0 ? communityIds : ["none"])
    .order("created_at", { ascending: false });

  // Get communities where user is admin/quorum for the create form
  const { data: adminCommunities } = profile
    ? await admin
        .from("community_memberships")
        .select("communities!community_memberships_community_id_fkey(id, name)")
        .eq("user_id", profile.id)
        .in("role", ["admin", "quorum"])
    : { data: null };

  const communities =
    adminCommunities?.map((m: any) => m.communities).filter(Boolean) ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Elections</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Power shifts through timed leadership rotation
          </p>
        </div>
        <AdvanceButton />
      </div>

      {communities.length > 0 && (
        <Card className="mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Call an election
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CreateElectionForm communities={communities} />
          </CardContent>
        </Card>
      )}

      {elections && elections.length > 0 ? (
        <div className="space-y-3">
          {elections.map((e: any) => {
            const now = new Date();
            const phase =
              e.status === "nominations"
                ? `Nominations close ${new Date(e.nominations_close).toLocaleDateString()}`
                : e.status === "voting"
                  ? `Voting closes ${new Date(e.voting_close).toLocaleDateString()}`
                  : e.status === "completed"
                    ? `Completed ${new Date(e.voting_close).toLocaleDateString()}`
                    : "Cancelled";

            return (
              <Link key={e.id} href={`/elections/${e.id}`}>
                <Card className="transition hover:border-primary/30">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="mb-1 flex items-center gap-2">
                          <Badge variant={STATUS_VARIANT[e.status] ?? "outline"}>
                            {e.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {e.communities?.name}
                          </span>
                          {isPlatformAdmin && e.communities?.subject && (
                            <Badge variant="outline" className="text-[10px]">
                              {e.communities.subject}
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-base font-medium">{e.title}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {phase}
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{e.seats} seats</p>
                        <p>{e.term_days} day term</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No elections yet. Elections are triggered automatically when leadership group
            terms expire, or can be called manually.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
