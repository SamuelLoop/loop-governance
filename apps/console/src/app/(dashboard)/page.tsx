import { createServiceClient } from "@/lib/supabase-server";

export default async function DashboardPage() {
  const admin = createServiceClient();

  const [
    { count: communityCount },
    { count: memberCount },
    { count: proposalCount },
    { count: openProposalCount },
  ] = await Promise.all([
    admin.from("communities").select("*", { count: "exact", head: true }),
    admin.from("community_memberships").select("*", { count: "exact", head: true }),
    admin.from("proposals").select("*", { count: "exact", head: true }),
    admin.from("proposals").select("*", { count: "exact", head: true }).eq("status", "open"),
  ]);

  const { data: recentProposals } = await admin
    .from("proposals")
    .select("id, title, status, created_at, votes_for, votes_against")
    .order("created_at", { ascending: false })
    .limit(5);

  const stats = [
    { label: "Communities", value: communityCount ?? 0 },
    { label: "Members", value: memberCount ?? 0 },
    { label: "Proposals", value: proposalCount ?? 0 },
    { label: "Open votes", value: openProposalCount ?? 0 },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-light tracking-tight">Dashboard</h1>

      <div className="mb-8 grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-5"
          >
            <p className="mb-1 font-mono text-xs uppercase tracking-wider text-neutral-500">
              {s.label}
            </p>
            <p className="text-3xl font-light text-neutral-100">{s.value}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-neutral-500">
          Recent proposals
        </h2>
        {recentProposals && recentProposals.length > 0 ? (
          <div className="space-y-2">
            {recentProposals.map((p) => (
              <a
                key={p.id}
                href={`/proposals/${p.id}`}
                className="group flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/50 px-5 py-3 transition hover:border-amber-500/30"
              >
                <div>
                  <p className="text-sm text-neutral-100 group-hover:text-amber-400">
                    {p.title}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-green-500">
                    +{p.votes_for}
                  </span>
                  <span className="font-mono text-xs text-red-400">
                    -{p.votes_against}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] ${
                      p.status === "open"
                        ? "bg-amber-500/10 text-amber-400"
                        : p.status === "approved"
                          ? "bg-green-500/10 text-green-400"
                          : p.status === "rejected"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-neutral-800 text-neutral-500"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500">
            No proposals yet. Create one to get started.
          </p>
        )}
      </div>
    </div>
  );
}
