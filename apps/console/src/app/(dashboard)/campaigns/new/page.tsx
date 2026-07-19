import { createClient, createServiceClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CampaignForm } from "./campaign-form";

export default async function NewCampaignPage() {
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

  const { data: memberships } = await admin
    .from("community_memberships")
    .select("community_id, communities(id, name, level, subject)")
    .eq("user_id", profile.id);

  const communities =
    memberships?.map((m: any) => m.communities).filter(Boolean) ?? [];

  const { data: existingCampaigns } = await admin
    .from("campaigns")
    .select("community_id")
    .eq("user_id", profile.id)
    .eq("active", true);

  const usedCommunityIds = new Set(
    (existingCampaigns ?? []).map((c: any) => c.community_id)
  );

  const availableCommunities = communities.filter(
    (c: any) => !usedCommunityIds.has(c.id)
  );

  return (
    <div className="max-w-2xl">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4"
        render={<Link href="/campaigns" />}
      >
        <ChevronLeft className="mr-1 h-3 w-3" />
        Back to campaigns
      </Button>

      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        Create campaign
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Tell your community why they should delegate their vote to you. A
        compelling pitch helps people understand your vision for leadership.
      </p>

      {availableCommunities.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              You already have active campaigns in all your communities.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Your campaign pitch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CampaignForm
              userId={profile.id}
              communities={availableCommunities}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
