"use server";

import { createServiceClient } from "@/lib/supabase-server";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export async function devLogin(
  _prev: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const email = formData.get("email") as string;
  if (!email) return { error: "Email is required." };

  const admin = createServiceClient();

  let user: { id: string; email?: string } | undefined;
  let page = 1;
  while (!user) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 50 });
    if (!data?.users?.length) break;
    user = data.users.find((u) => u.email === email);
    page++;
  }

  if (!user) {
    return { error: "No account found for this email." };
  }

  const tempPass = `dev_${Date.now()}`;
  await admin.auth.admin.updateUserById(user.id, { password: tempPass });

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: tempPass,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/");
}
