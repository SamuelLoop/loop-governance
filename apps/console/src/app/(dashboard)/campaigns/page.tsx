import { createClient, createServiceClient } from "@/lib/supabase-server";
import { getActiveSubject } from "@/lib/subject";
import { redirect } from "next/navigation";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CampaignFilters } from "./campaign-filters";
import { ExternalLink, Megaphone, Users } from "lucide-react";
import { Glass, StatusChip } from "@loop/ui";

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
          <h1 className="text-h1 font-bold tracking-tight text-text-primary">Campaigns</h1>
          <p className="mt-1 max-w-xl text-body text-text-secondary">
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
          <h2 className="mb-2 text-caption font-medium uppercase tracking-wider text-text-secondary">
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
                <StatusChip variant="neutral" className="gap-1">
                  {c.type === "flyer" ? (
                    <Users className="h-3 w-3" />
                  ) : (
                    <Megaphone className="h-3 w-3" />
                  )}
                  {c.communities?.name}
                  <ExternalLink className="h-2.5 w-2.5 opacity-50" />
                </StatusChip>
              </a>
            ))}
          </div>
        </div>
      )}

      <CampaignFilters currentLevel={params.level} />

      <div className="mt-6 space-y-3">
        {filtered.length === 0 ? (
          <Glass className="py-8 text-center">
            <p className="text-body text-text-secondary">
              No campaigns found for this filter. Be the first to campaign!
            </p>
          </Glass>
        ) : (
          filtered.map((c: any) => (
            <Glass key={c.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <Avatar size="lg">
                      <AvatarImage src={c.users?.avatar_url ?? undefined} alt="" />
                      <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
                        {c.users?.display_name?.[0]?.toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-body font-medium text-text-primary">
                        {c.users?.display_name}
                      </p>
                      {c.users?.location_name && (
                        <p className="text-caption text-text-secondary">
                          {c.users.location_name}
                        </p>
                      )}
                    </div>
                  </div>

                  <h3 className="mt-3 text-h2 font-bold text-text-primary">
                    {c.headline || c.pitch}
                  </h3>

                  {c.youtube_url && (
                    <p className="mt-1 text-caption text-text-secondary">
                      Includes video pitch
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex gap-1.5">
                    <StatusChip variant="neutral">
                      {c.type === "flyer" ? "Flyer" : "Campaign"}
                    </StatusChip>
                    <StatusChip variant="neutral">{c.communities?.level}</StatusChip>
                  </div>
                  <span className="text-caption text-text-secondary">
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
            </Glass>
          ))
        )}
      </div>
    </div>
  );
}
