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

export async function changePassword(
  _prev: { error: string; success: boolean },
  formData: FormData
): Promise<{ error: string; success: boolean }> {
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters", success: false };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match", success: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", success: false };

  // Use the admin API to set the password AND confirm the email. This is
  // the reliable path for accounts that were originally created via OAuth
  // (Google, X, etc), which sometimes lack an 'email' identity in
  // auth.identities. Without that identity signInWithPassword returns
  // 'Invalid login credentials' even when encrypted_password is set.
  const admin = createServiceClient();
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
  });

  if (error) {
    if (error.message.includes("different from the old")) {
      return { error: "New password must be different from your current one", success: false };
    }
    return { error: error.message, success: false };
  }

  return { error: "", success: true };
}
