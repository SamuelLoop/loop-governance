"use server";

import { createServiceClient } from "@/lib/supabase-server";

export async function devLogin(
  _prev: { error: string; url: string },
  formData: FormData
): Promise<{ error: string; url: string }> {
  const email = formData.get("email") as string;
  if (!email) return { error: "Email is required.", url: "" };

  const admin = createServiceClient();

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://console.loopcmbntr.live"}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message, url: "" };
  }

  return { error: "", url: data.properties.action_link };
}
