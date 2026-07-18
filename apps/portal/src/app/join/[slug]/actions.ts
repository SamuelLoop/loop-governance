"use server";

import { createServiceClient } from "@/lib/supabase-server";

export type EnrollmentState = {
  step: number;
  error?: string;
  success?: boolean;
  communityId?: string;
  communityName?: string;
  authId?: string;
};

export async function submitEnrollment(
  _prev: EnrollmentState,
  formData: FormData
): Promise<EnrollmentState> {
  const admin = createServiceClient();
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

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: crypto.randomUUID(),
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });

    if (authError) {
      if (authError.message.includes("already been registered")) {
        return { step: 1, error: "This email is already registered.", communityId, communityName };
      }
      return { step: 1, error: authError.message, communityId, communityName };
    }

    const authId = authData.user.id;

    const { error: userError } = await admin
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

    return { step: 2, communityId, communityName, authId };
  }

  if (step === 2) {
    const interests = formData.getAll("interests") as string[];
    const authId = formData.get("authId") as string;

    if (!authId) {
      return { step: 1, error: "Session lost. Please start over.", communityId, communityName };
    }

    if (interests.length > 0) {
      await admin
        .from("users")
        .update({ subject_expertise: interests })
        .eq("auth_id", authId);
    }

    return { step: 3, communityId, communityName, authId };
  }

  if (step === 3) {
    const authId = formData.get("authId") as string;

    if (!authId) {
      return { step: 1, error: "Session lost. Please start over.", communityId, communityName };
    }

    const { data: profile } = await admin
      .from("users")
      .select("id")
      .eq("auth_id", authId)
      .single();

    if (!profile) {
      return { step: 3, error: "Profile not found.", communityId, communityName, authId };
    }

    const { error: memberError } = await admin
      .from("community_memberships")
      .insert({
        user_id: profile.id,
        community_id: communityId,
        role: "member",
      });

    if (memberError && !memberError.message.includes("duplicate")) {
      return { step: 3, error: memberError.message, communityId, communityName, authId };
    }

    return { step: 4, success: true, communityId, communityName };
  }

  return { step: 1, communityId, communityName };
}
