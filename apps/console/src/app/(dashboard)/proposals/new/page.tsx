import { createClient, createServiceClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateProposalForm } from "./form";
import { getActiveSubject, getAdminContext } from "@/lib/subject";

export default async function NewProposalPage() {
  const supabase = await createClient();
  const admin = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await admin
    .from("users")
    .select("id, platform_role")
    .eq("auth_id", user.id)
    .single();

  if (!profile) redirect("/");

  const isPlatformAdmin = profile.platform_role === "platform_admin";

  let communities: { id: string; name: string; slug: string; level: string }[] = [];

  if (isPlatformAdmin) {
    const { data } = await admin
      .from("communities")
      .select("id, name, slug, level")
      .order("level");
    communities = data ?? [];
  } else {
    const activeSubject = await getActiveSubject();
    const { data: memberships } = await admin
      .from("community_memberships")
      .select("communities!inner(id, name, slug, level, subject)")
      .eq("user_id", profile.id);

    communities = (memberships ?? [])
      .map((m: any) => m.communities)
      .filter((c: any) => c && c.subject === activeSubject)
      .sort((a: any, b: any) => a.level.localeCompare(b.level));
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        New proposal
      </h1>
      <Card>
        <CardContent className="pt-6">
          <CreateProposalForm
            communities={communities ?? []}
            userId={profile.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
