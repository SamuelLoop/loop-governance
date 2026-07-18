"use server";

import { createServiceClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export async function devLogin(
  _prev: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const email = formData.get("email") as string;
  if (!email) return { error: "Email is required." };

  const admin = createServiceClient();

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://console.loopcmbntr.live"}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  const url = new URL(data.properties.action_link);
  redirect(url.toString());
}
