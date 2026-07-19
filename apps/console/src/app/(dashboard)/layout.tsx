import { createClient, createServiceClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { AppSidebar } from "./app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getActiveSubject } from "@/lib/subject";

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

  const [{ data: subjectRows }, { data: profile }] = await Promise.all([
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
        <main className="flex-1 px-8 py-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
