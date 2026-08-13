import { createClient, createServiceClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { ProfileForm } from "./profile-form";
import { PasswordForm } from "./password-form";
import { FirstPasswordPrompt } from "./first-password-prompt";
import { Suspense } from "react";
import { Glass } from "@loop/ui";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createServiceClient();
  const { data: profile } = await admin
    .from("users")
    .select("display_name, avatar_url, location_name, bio, email")
    .eq("auth_id", user.id)
    .single();

  if (!profile) redirect("/login");

  return (
    <div>
      <Suspense fallback={null}>
        <FirstPasswordPrompt />
      </Suspense>
      <h1 className="mb-1 text-h1 font-bold tracking-tight text-text-primary">
        My Account
      </h1>
      <p className="mb-6 text-body text-text-secondary">
        Manage your profile and identity across the governance platform
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <Glass className="p-5">
          <h2 className="mb-3 text-h2 font-bold text-text-primary">Profile</h2>
          <ProfileForm profile={profile} />
        </Glass>

        <Glass className="p-5">
          <h2 className="mb-3 text-h2 font-bold text-text-primary">Change password</h2>
          <p className="mb-4 text-body text-text-secondary">
            Set a password to sign in directly without a magic link. This
            also works on the admin console if you have admin access.
          </p>
          <PasswordForm />
        </Glass>

        <Glass className="p-5">
          <h2 className="mb-3 text-h2 font-bold text-text-primary">Your identity</h2>
          <div className="space-y-4 text-body text-text-secondary">
            <p>
              Your profile is visible across all communities you participate
              in. Your avatar and display name appear on campaign posters,
              power badges, chat messages, and election ballots.
            </p>
            <Glass className="p-4">
              <p className="text-caption font-medium text-text-primary">Tip</p>
              <p className="mt-1 text-caption text-text-secondary">
                Add a profile photo and a short bio to build trust with your
                community members. Governance is about people, and people
                trust people they can see.
              </p>
            </Glass>
          </div>
        </Glass>
      </div>
    </div>
  );
}
