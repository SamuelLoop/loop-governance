import { createClient, createServiceClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { CreateProposalForm } from "./form";
import { getActiveSubject, getAdminContext } from "@/lib/subject";
import { Glass } from "@loop/ui";

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

  // Load children per community so the cascade form can render splits
  const communityIds = communities.map((c) => c.id);
  const { data: allChildren } = communityIds.length
    ? await admin
        .from("communities")
        .select("id, name, level, parent_id")
        .in("parent_id", communityIds)
    : { data: [] };
  const childrenByParent: Record<string, { id: string; name: string; level: string; parent_id: string | null }[]> = {};
  for (const c of allChildren ?? []) {
    if (!c.parent_id) continue;
    if (!childrenByParent[c.parent_id]) childrenByParent[c.parent_id] = [];
    childrenByParent[c.parent_id].push({
      id: c.id, name: c.name, level: c.level, parent_id: c.parent_id,
    });
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-h1 font-bold tracking-tight text-text-primary">
        New proposal
      </h1>
      <Glass className="p-6">
        <CreateProposalForm
          communities={communities ?? []}
          childrenByParent={childrenByParent}
          userId={profile.id}
        />
      </Glass>
    </div>
  );
}
