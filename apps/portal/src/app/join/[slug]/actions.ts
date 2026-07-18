"use server";

import { createClient } from "@/lib/supabase-server";

export type EnrollmentState = {
  step: number;
  error?: string;
  success?: boolean;
  communityId?: string;
  communityName?: string;
};

export async function submitEnrollment(
  _prev: EnrollmentState,
  formData: FormData
): Promise<EnrollmentState> {
  const supabase = await createClient();
  const step = Number(formData.get("step"));
  const communityId = formData.get("communityId") as string;
  const communityName = formData.get("communityName") as string;

  if (step === 1) {
    const email = formData.get("email") as string;
    const displayName = formData.get("displayName") as string;
    const location = formData.get("location") as string;

    if (!email || !displayName) {
      return { step: 1, error: "Name and email are required.", communityId, communityName };
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: crypto.randomUUID(),
      options: {
        data: { display_name: displayName },
      },
    });

    if (authError) {
      if (authError.message.includes("already registered")) {
        return { step: 1, error: "This email is already registered. Please sign in instead.", communityId, communityName };
      }
      return { step: 1, error: authError.message, communityId, communityName };
    }

    const authId = authData.user?.id;
    if (!authId) {
      return { step: 1, error: "Failed to create account.", communityId, communityName };
    }

    const { error: userError } = await supabase
      .from("users")
      .insert({
        auth_id: authId,
        display_name: displayName,
        email,
        location_name: location || null,
      });

    if (userError && !userError.message.includes("duplicate")) {
      return { step: 1, error: userError.message, communityId, communityName };
    }

    return { step: 2, communityId, communityName };
  }

  if (step === 2) {
    const interests = formData.getAll("interests") as string[];

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { step: 2, error: "Session expired. Please start over.", communityId, communityName };
    }

    if (interests.length > 0) {
      await supabase
        .from("users")
        .update({ subject_expertise: interests })
        .eq("auth_id", user.id);
    }

    return { step: 3, communityId, communityName };
  }

  if (step === 3) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { step: 3, error: "Session expired. Please start over.", communityId, communityName };
    }

    const { data: profile } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (!profile) {
      return { step: 3, error: "Profile not found.", communityId, communityName };
    }

    const { error: memberError } = await supabase
      .from("community_memberships")
      .insert({
        user_id: profile.id,
        community_id: communityId,
        role: "member",
      });

    if (memberError && !memberError.message.includes("duplicate")) {
      return { step: 3, error: memberError.message, communityId, communityName };
    }

    return { step: 4, success: true, communityId, communityName };
  }

  return { step: 1, communityId, communityName };
}
