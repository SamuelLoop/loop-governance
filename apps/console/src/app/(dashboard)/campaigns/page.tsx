import { createClient, createServiceClient } from "@/lib/supabase-server";
import { getActiveSubject } from "@/lib/subject";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CampaignFilters } from "./campaign-filters";
import { ExternalLink, Megaphone, Users } from "lucide-react";

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

  const { data: campaigns } = await admin
    .from("campaigns")
    .select(
      `id, pitch, headline, type, slug, youtube_url, created_at, active,
      users!campaigns_user_id_fkey(id, display_name, location_name, avatar_url),
      communities!campaigns_community_id_fkey(id, name, level, subject, slug, quorum_threshold_pct)`
    )
    .eq("active", true)
    .order("created_at", { ascending: false });

  let filtered = (campaigns ?? []).filter(
    (c: any) => c.communities?.subject === activeSubject
  );

  if (params.level) {
    filtered = filtered.filter(
      (c: any) => c.communities?.level === params.level
    );
  }

  const { data: myCampaigns } = await admin
    .from("campaigns")
    .select(
      "id, type, slug, communities!campaigns_community_id_fkey(name, level, subject)"
    )
    .eq("user_id", profile.id)
    .eq("active", true);

  const portalBase = "https://gov.loopcmbntr.live";

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Digital posters for leadership campaigns and community recruitment.
            Create a poster, share it anywhere, and bring people into governance.
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
            {(myCampaigns as any[]).map((c) => (
              <a
                key={c.id}
                href={c.slug ? `${portalBase}/c/${c.slug}` : "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5"
              >
                <Badge variant="secondary" className="gap-1">
                  {c.type === "flyer" ? (
                    <Users className="h-3 w-3" />
                  ) : (
                    <Megaphone className="h-3 w-3" />
                  )}
                  {c.communities?.name}
                  <ExternalLink className="h-2.5 w-2.5 opacity-50" />
                </Badge>
              </a>
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
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                        {c.users?.avatar_url ? (
                          <img
                            src={c.users.avatar_url}
                            alt=""
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          c.users?.display_name?.[0]?.toUpperCase() ?? "?"
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {c.users?.display_name}
                        </p>
                        {c.users?.location_name && (
                          <p className="text-xs text-muted-foreground">
                            {c.users.location_name}
                          </p>
                        )}
                      </div>
                    </div>

                    <h3 className="mt-3 text-base font-semibold">
                      {c.headline || c.pitch}
                    </h3>

                    {c.youtube_url && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Includes video pitch
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-1.5">
                      <Badge variant="outline">
                        {c.type === "flyer" ? "Flyer" : "Campaign"}
                      </Badge>
                      <Badge variant="secondary">{c.communities?.level}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {c.communities?.name}
                    </span>
                    {c.slug && (
                      <a
                        href={`${portalBase}/c/${c.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        View poster
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
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
