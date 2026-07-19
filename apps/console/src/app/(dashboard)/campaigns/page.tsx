import { createClient, createServiceClient } from "@/lib/supabase-server";
import { getActiveSubject } from "@/lib/subject";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CampaignFilters } from "./campaign-filters";

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; level?: string }>;
}) {
  const params = await searchParams;
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

  if (!profile) redirect("/");

  const activeSubject = await getActiveSubject();

  let query = admin
    .from("campaigns")
    .select(
      `id, pitch, experience, goals, created_at, active,
      users!campaigns_user_id_fkey(id, display_name, location_name),
      communities!campaigns_community_id_fkey(id, name, level, subject, quorum_threshold_pct)`
    )
    .eq("active", true)
    .order("created_at", { ascending: false });

  const { data: campaigns } = await query;

  let filtered = (campaigns ?? []).filter(
    (c: any) => c.communities?.subject === activeSubject
  );

  if (params.level) {
    filtered = filtered.filter(
      (c: any) => c.communities?.level === params.level
    );
  }

  const uniqueSubjects = [activeSubject];

  const { data: myCampaigns } = await admin
    .from("campaigns")
    .select("id, communities!campaigns_community_id_fkey(name, level, subject)")
    .eq("user_id", profile.id)
    .eq("active", true);

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            See who wants to lead in each subject. Create your own campaign to
            attract delegations.
          </p>
        </div>
        <Button size="sm" render={<Link href="/campaigns/new" />}>
          Create campaign
        </Button>
      </div>

      {myCampaigns && myCampaigns.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Your active campaigns
          </h2>
          <div className="flex flex-wrap gap-2">
            {myCampaigns.map((c: any) => (
              <Badge key={c.id} variant="secondary">
                {c.communities?.name} ({c.communities?.subject})
              </Badge>
            ))}
          </div>
        </div>
      )}

      <CampaignFilters currentLevel={params.level} />

      <div className="mt-6 space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No campaigns found for this filter. Be the first to campaign!
              </p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((c: any) => (
            <Card key={c.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        {c.users?.display_name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div>
                        <span className="text-sm font-medium">
                          {c.users?.display_name}
                        </span>
                        {c.users?.location_name && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {c.users.location_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="mt-2 text-sm">{c.pitch}</p>
                    {c.experience && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        <span className="font-medium">Experience:</span>{" "}
                        {c.experience}
                      </p>
                    )}
                    {c.goals && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        <span className="font-medium">Goals:</span> {c.goals}
                      </p>
                    )}
                  </div>
                  <div className="ml-4 flex flex-col items-end gap-1">
                    <Badge variant="outline">{c.communities?.level}</Badge>
                    <Badge variant="secondary">{c.communities?.subject}</Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {c.communities?.name}
                    </span>
                    <span className="mt-1 text-[10px] text-muted-foreground">
                      needs {parseFloat(c.communities?.quorum_threshold_pct)}% to
                      enter quorum
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
