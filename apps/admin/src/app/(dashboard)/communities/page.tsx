import { requireAdminSession } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase-server";

export default async function CommunitiesPage() {
  const session = await requireAdminSession();
  const admin = createServiceClient();

  const { data: communities } = await admin
    .from("communities")
    .select(`
      id, name, slug, subject, level, path,
      quorum_size, dunbar_limit, proposal_cap_cents,
      visibility, created_at
    `)
    .order("subject")
    .order("level")
    .order("name");

  const { data: memberCounts } = await admin
    .from("community_memberships")
    .select("community_id")
    .then((r) => {
      const counts = new Map<string, number>();
      for (const m of r.data ?? []) {
        counts.set(m.community_id, (counts.get(m.community_id) ?? 0) + 1);
      }
      return { data: counts };
    });

  const subjects = [...new Set((communities ?? []).map((c) => c.subject))].sort();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Communities</h1>
        <p className="text-sm text-muted-foreground">
          {communities?.length ?? 0} communities across {subjects.length} subjects
        </p>
      </div>

      {subjects.map((subject) => {
        const subjectCommunities = (communities ?? []).filter((c) => c.subject === subject);
        return (
          <div key={subject} className="mb-8">
            <h2 className="mb-3 text-lg font-semibold capitalize">{subject}</h2>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Name</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Level</th>
                    <th className="hidden px-4 py-2.5 text-right font-medium text-muted-foreground md:table-cell">Members</th>
                    <th className="hidden px-4 py-2.5 text-right font-medium text-muted-foreground md:table-cell">Quorum</th>
                    <th className="hidden px-4 py-2.5 text-right font-medium text-muted-foreground lg:table-cell">Proposal Cap</th>
                    <th className="hidden px-4 py-2.5 text-left font-medium text-muted-foreground lg:table-cell">Visibility</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectCommunities.map((c) => {
                    const members = memberCounts?.get(c.id) ?? 0;
                    const depth = (c.path?.split(".").length ?? 1) - 1;
                    return (
                      <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                        <td className="px-4 py-3">
                          <div style={{ paddingLeft: `${depth * 16}px` }}>
                            <p className="font-medium">{c.name}</p>
                            <p className="text-xs text-muted-foreground">{c.slug}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                            c.level === "global"
                              ? "border-amber-500/40 bg-amber-500/15 text-amber-400"
                              : c.level === "continental" || c.level === "national"
                                ? "border-blue-500/40 bg-blue-500/15 text-blue-400"
                                : "border-border bg-secondary/50 text-muted-foreground"
                          }`}>
                            {c.level}
                          </span>
                        </td>
                        <td className="hidden px-4 py-3 text-right tabular-nums md:table-cell">
                          {members}
                        </td>
                        <td className="hidden px-4 py-3 text-right tabular-nums md:table-cell">
                          {c.quorum_size}
                        </td>
                        <td className="hidden px-4 py-3 text-right tabular-nums lg:table-cell">
                          {c.proposal_cap_cents != null
                            ? `$${(c.proposal_cap_cents / 100).toLocaleString()}`
                            : <span className="text-muted-foreground">None</span>}
                        </td>
                        <td className="hidden px-4 py-3 lg:table-cell">
                          <span className={`text-xs ${
                            c.visibility === "public" ? "text-green-400" : "text-muted-foreground"
                          }`}>
                            {c.visibility ?? "public"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
