import { createClient, createServiceClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "./profile-form";
import { PasswordForm } from "./password-form";
import { FirstPasswordPrompt } from "./first-password-prompt";
import { Suspense } from "react";

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
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        My Account
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Manage your profile and identity across the governance platform
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm profile={profile} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Change password</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Set a password to sign in directly without a magic link. This
              also works on the admin console if you have admin access.
            </p>
            <PasswordForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your identity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Your profile is visible across all communities you participate
              in. Your avatar and display name appear on campaign posters,
              power badges, chat messages, and election ballots.
            </p>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs font-medium text-foreground">Tip</p>
              <p className="mt-1 text-xs">
                Add a profile photo and a short bio to build trust with your
                community members. Governance is about people, and people
                trust people they can see.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
