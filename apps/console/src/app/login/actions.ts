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

  // Set a temporary password and sign in with it
  const { data: users } = await admin.auth.admin.listUsers();
  const user = users?.users.find((u) => u.email === email);

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
