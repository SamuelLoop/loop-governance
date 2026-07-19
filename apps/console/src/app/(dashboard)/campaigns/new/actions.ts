"use server";

import { createServiceClient, createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export async function createCampaign(
  _prev: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const userId = formData.get("user_id") as string;
  const communityId = formData.get("community_id") as string;
  const pitch = formData.get("pitch") as string;
  const experience = (formData.get("experience") as string) || null;
  const goals = (formData.get("goals") as string) || null;

  if (!communityId) return { error: "Please select a community" };
  if (!pitch?.trim()) return { error: "Pitch is required" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createServiceClient();

  const { data: membership } = await admin
    .from("community_memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("community_id", communityId)
    .single();

  if (!membership) return { error: "You must be a member of this community" };

  const { error } = await admin.from("campaigns").upsert(
    {
      user_id: userId,
      community_id: communityId,
      pitch: pitch.trim(),
      experience: experience?.trim() || null,
      goals: goals?.trim() || null,
      active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,community_id" }
  );

  if (error) return { error: error.message };

  redirect("/campaigns");
}
