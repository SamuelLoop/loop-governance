import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { Sidebar } from "./sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar userEmail={user.email ?? ""} />
      <main className="flex-1 px-8 py-6">{children}</main>
    </div>
  );
}
