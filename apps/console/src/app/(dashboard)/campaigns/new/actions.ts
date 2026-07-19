"use server";

import { createServiceClient, createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

function generateSlug(headline: string, communityName: string): string {
  const base = (headline || communityName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

export async function createCampaign(
  _prev: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const userId = formData.get("user_id") as string;
  const communityId = formData.get("community_id") as string;
  const type = (formData.get("type") as string) || "campaign";
  const headline = (formData.get("headline") as string)?.trim();
  const youtubeUrl = (formData.get("youtube_url") as string)?.trim() || null;
  const bannerUrl = (formData.get("banner_url") as string)?.trim() || null;
  const contentRaw = formData.get("content") as string;

  if (!communityId) return { error: "Please select a community" };
  if (!headline) return { error: "Headline is required" };

  let content: any = null;
  try {
    content = contentRaw ? JSON.parse(contentRaw) : null;
  } catch {
    return { error: "Invalid content format" };
  }

  if (!content) return { error: "Content is required" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createServiceClient();

  const { data: profile } = await admin
    .from("users")
    .select("id, platform_role")
    .eq("auth_id", user.id)
    .single();

  if (!profile) return { error: "No profile" };

  if (profile.platform_role !== "platform_admin") {
    const { data: membership } = await admin
      .from("community_memberships")
      .select("id")
      .eq("user_id", userId)
      .eq("community_id", communityId)
      .single();

    if (!membership) return { error: "You must be a member of this community" };
  }

  const { data: community } = await admin
    .from("communities")
    .select("name, slug")
    .eq("id", communityId)
    .single();

  const slug = generateSlug(headline, community?.name ?? "campaign");

  const pitch = headline;

  const { error } = await admin.from("campaigns").upsert(
    {
      user_id: userId,
      community_id: communityId,
      type,
      pitch,
      headline,
      content,
      youtube_url: youtubeUrl,
      banner_url: bannerUrl,
      slug,
      active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,community_id" }
  );

  if (error) return { error: error.message };

  redirect("/campaigns");
}
