import { createClient, createServiceClient } from "@/lib/supabase-server";
import { getActiveSubject } from "@/lib/subject";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CampaignForm } from "./campaign-form";
import { Glass } from "@loop/ui";

export default async function NewCampaignPage() {
  const supabase = await createClient();
  const admin = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await admin
    .from("users")
    .select("id, display_name, platform_role")
    .eq("auth_id", user.id)
    .single();

  if (!profile) redirect("/");

  const activeSubject = await getActiveSubject();
  const isPlatformAdmin = profile.platform_role === "platform_admin";

  let communities: { id: string; name: string; level: string; subject: string; slug: string }[];

  if (isPlatformAdmin) {
    const { data } = await admin
      .from("communities")
      .select("id, name, level, subject, slug")
      .eq("subject", activeSubject)
      .order("name");
    communities = data ?? [];
  } else {
    const { data: memberships } = await admin
      .from("community_memberships")
      .select(
        "community_id, communities!community_memberships_community_id_fkey(id, name, level, subject, slug)"
      )
      .eq("user_id", profile.id);

    communities = (memberships ?? [])
      .map((m: any) => m.communities)
      .filter((c: any) => c && c.subject === activeSubject);
  }

  const { data: existingCampaigns } = await admin
    .from("campaigns")
    .select("community_id")
    .eq("user_id", profile.id)
    .eq("active", true);

  const usedCommunityIds = new Set(
    (existingCampaigns ?? []).map((c: any) => c.community_id)
  );

  const availableCommunities = communities.filter(
    (c) => !usedCommunityIds.has(c.id)
  );

  return (
    <div className="max-w-4xl">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4"
        render={<Link href="/campaigns" />}
      >
        <ChevronLeft className="mr-1 h-3 w-3" />
        Back to campaigns
      </Button>

      <h1 className="mb-1 text-h1 font-bold tracking-tight text-text-primary">
        Create a campaign
      </h1>
      <p className="mb-6 max-w-2xl text-body text-text-secondary">
        Build a digital poster to rally support. Choose a template, customise
        it with your message, embed a video pitch, and publish. Your poster
        gets a shareable link that works on any device.
      </p>

      {availableCommunities.length === 0 ? (
        <Glass className="py-8 text-center">
          <p className="text-body text-text-secondary">
            You already have active campaigns in all your communities, or you
            are not a member of any {activeSubject} communities yet.
          </p>
        </Glass>
      ) : (
        <CampaignForm
          userId={profile.id}
          userName={profile.display_name ?? "Candidate"}
          communities={availableCommunities}
        />
      )}
    </div>
  );
}
