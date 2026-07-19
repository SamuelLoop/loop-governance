"use server";

import { createServiceClient, createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function updateProfile(
  _prev: { error: string; success: boolean },
  formData: FormData
): Promise<{ error: string; success: boolean }> {
  const displayName = (formData.get("display_name") as string)?.trim();
  const avatarUrl = (formData.get("avatar_url") as string)?.trim() || null;
  const locationName = (formData.get("location_name") as string)?.trim() || null;
  const bio = (formData.get("bio") as string)?.trim() || null;

  if (!displayName) return { error: "Display name is required", success: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", success: false };

  const admin = createServiceClient();
  const { error } = await admin
    .from("users")
    .update({
      display_name: displayName,
      avatar_url: avatarUrl,
      location_name: locationName,
      bio,
    })
    .eq("auth_id", user.id);

  if (error) return { error: error.message, success: false };

  revalidatePath("/account");
  revalidatePath("/");
  return { error: "", success: true };
}
