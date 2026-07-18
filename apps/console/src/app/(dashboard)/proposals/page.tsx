import { createServiceClient } from "@/lib/supabase-server";
import Link from "next/link";

export default async function ProposalsPage() {
  const admin = createServiceClient();

  const { data: proposals } = await admin
    .from("proposals")
    .select(`
      id, title, description, status, budget_request_cents,
      votes_for, votes_against, opens_at, closes_at, created_at,
      users!proposals_author_id_fkey(display_name),
      communities!proposals_community_id_fkey(name, slug)
    `)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-light tracking-tight">Proposals</h1>
        <Link
          href="/proposals/new"
          className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-500"
        >
          New proposal
        </Link>
      </div>

      {proposals && proposals.length > 0 ? (
        <div className="space-y-3">
          {proposals.map((p: any) => (
            <Link
              key={p.id}
              href={`/proposals/${p.id}`}
              className="group block rounded-lg border border-neutral-800 bg-neutral-900/50 p-5 transition hover:border-amber-500/30"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] ${
                        p.status === "open"
                          ? "bg-amber-500/10 text-amber-400"
                          : p.status === "approved"
                            ? "bg-green-500/10 text-green-400"
                            : p.status === "rejected"
                              ? "bg-red-500/10 text-red-400"
                              : p.status === "draft"
                                ? "bg-neutral-800 text-neutral-500"
                                : "bg-neutral-800 text-neutral-500"
                      }`}
                    >
                      {p.status}
                    </span>
                    <span className="text-xs text-neutral-600">
                      {p.communities?.name}
                    </span>
                  </div>
                  <h3 className="text-base font-medium text-neutral-100 group-hover:text-amber-400">
                    {p.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-neutral-400">
                    {p.description}
                  </p>
                  <p className="mt-2 text-xs text-neutral-500">
                    by {p.users?.display_name ?? "Unknown"} on{" "}
                    {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="ml-4 flex flex-col items-end gap-1">
                  <div className="flex gap-2 font-mono text-sm">
                    <span className="text-green-500">+{p.votes_for}</span>
                    <span className="text-red-400">-{p.votes_against}</span>
                  </div>
                  {p.budget_request_cents != null && (
                    <span className="text-xs text-neutral-500">
                      ${(p.budget_request_cents / 100).toFixed(2)} requested
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-10 text-center">
          <p className="text-neutral-400">No proposals yet.</p>
          <Link
            href="/proposals/new"
            className="mt-2 inline-block text-sm text-amber-500 hover:text-amber-400"
          >
            Create the first one
          </Link>
        </div>
      )}
    </div>
  );
}
