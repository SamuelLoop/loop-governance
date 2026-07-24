import { createClient, createServiceClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { AppSidebar } from "./app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getActiveSubject } from "@/lib/subject";
import { LoopPriceTicker } from "@/components/loop-price-ticker";
import { ensureBaselineMemberships } from "@/lib/baseline-memberships";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createServiceClient();

  const [{ data: subjectRows }, { data: existingProfile }] = await Promise.all([
    admin
      .from("communities")
      .select("subject")
      .not("subject", "is", null),
    admin
      .from("users")
      .select("id, display_name, avatar_url")
      .eq("auth_id", user.id)
      .single(),
  ]);

  let profile = existingProfile;
  if (!profile) {
    const meta = user.user_metadata ?? {};
    const displayName =
      meta.full_name ||
      meta.name ||
      meta.preferred_username ||
      meta.user_name ||
      user.email?.split("@")[0] ||
      "User";
    const email = user.email || meta.email || `${user.id}@noemail`;
    const avatarUrl = meta.avatar_url || meta.picture || null;

    const { data: newProfile } = await admin
      .from("users")
      .insert({
        auth_id: user.id,
        display_name: displayName,
        email,
        avatar_url: avatarUrl,
      })
      .select("id, display_name, avatar_url")
      .single();

    profile = newProfile;
  }

  // Everyone is a member of the Global Governance community by default;
  // other subjects stay opt-in. Idempotent, no-op after first pass.
  if (profile?.id) {
    await ensureBaselineMemberships(profile.id);
  }

  const subjects = [
    ...new Set((subjectRows ?? []).map((r: any) => r.subject as string)),
  ].sort();

  const activeSubject = await getActiveSubject();

  return (
    <SidebarProvider>
      <AppSidebar
        userEmail={user.email ?? ""}
        userName={profile?.display_name ?? user.email?.split("@")[0] ?? "User"}
        userAvatar={profile?.avatar_url ?? null}
        subjects={subjects}
        activeSubject={subjects.includes(activeSubject) ? activeSubject : subjects[0] ?? "governance"}
      />
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b bg-background px-4">
          <div className="flex items-center md:hidden">
            <SidebarTrigger />
            <span className="ml-3 text-sm font-semibold">Loop_cmbntr</span>
          </div>
          <div className="ml-auto">
            <LoopPriceTicker />
          </div>
        </header>
        <main className="flex-1 px-4 py-4 md:px-8 md:py-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
