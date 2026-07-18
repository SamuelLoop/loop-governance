import { createClient, createServiceClient } from "@/lib/supabase-server";
import { notFound, redirect } from "next/navigation";
import { VoteButtons } from "./vote-buttons";

export default async function ProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: proposal } = await admin
    .from("proposals")
    .select(`
      *,
      users!proposals_author_id_fkey(display_name, email),
      communities!proposals_community_id_fkey(name, slug, quorum_size)
    `)
    .eq("id", id)
    .single();

  if (!proposal) notFound();

  const { data: profile } = await admin
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  const { data: existingVote } = profile
    ? await admin
        .from("votes")
        .select("id, choice")
        .eq("proposal_id", id)
        .eq("voter_id", profile.id)
        .single()
    : { data: null };

  const { data: allVotes } = await admin
    .from("votes")
    .select(`
      id, choice, weight, cast_at,
      users!votes_voter_id_fkey(display_name)
    `)
    .eq("proposal_id", id)
    .order("cast_at", { ascending: false });

  // Evaluate proposal if voting period has expired
  if (
    proposal.status === "open" &&
    proposal.closes_at &&
    new Date(proposal.closes_at) <= new Date()
  ) {
    await admin.rpc("evaluate_proposal", { p_id: id });
    // Re-fetch to get updated status
    const { data: updated } = await admin
      .from("proposals")
      .select("status")
      .eq("id", id)
      .single();
    if (updated) proposal.status = updated.status;
  }

  const total = proposal.votes_for + proposal.votes_against;
  const forPct = total > 0 ? (proposal.votes_for / total) * 100 : 0;
  const voterCount = allVotes?.length ?? 0;
  const quorumSize = (proposal as any).communities?.quorum_size ?? 10;
  const quorumMet = voterCount >= quorumSize;
  const quorumPct = Math.min((voterCount / quorumSize) * 100, 100);

  return (
    <div className="max-w-3xl">
      <div className="mb-1 flex items-center gap-2">
        <span
          className={`rounded px-2 py-0.5 text-[11px] ${
            proposal.status === "open"
              ? "bg-amber-500/10 text-amber-400"
              : proposal.status === "approved"
                ? "bg-green-500/10 text-green-400"
                : proposal.status === "rejected"
                  ? "bg-red-500/10 text-red-400"
                  : "bg-neutral-800 text-neutral-500"
          }`}
        >
          {proposal.status}
        </span>
        <span className="text-xs text-neutral-600">
          {proposal.communities?.name}
        </span>
      </div>

      <h1 className="mb-2 text-2xl font-light tracking-tight">
        {proposal.title}
      </h1>

      <p className="mb-6 text-xs text-neutral-500">
        by {proposal.users?.display_name} on{" "}
        {new Date(proposal.created_at).toLocaleDateString()}
        {proposal.closes_at && (
          <>
            {" "}
            / voting closes{" "}
            {new Date(proposal.closes_at).toLocaleDateString()}
          </>
        )}
      </p>

      <div className="mb-6 whitespace-pre-wrap text-sm leading-relaxed text-neutral-300">
        {proposal.description}
      </div>

      {proposal.consequence && (
        <div className="mb-6 rounded-md border border-neutral-800 bg-neutral-900/50 p-4">
          <p className="mb-1 font-mono text-xs uppercase tracking-wider text-neutral-500">
            If approved
          </p>
          <p className="text-sm text-neutral-300">{proposal.consequence}</p>
        </div>
      )}

      {proposal.budget_request_cents != null && (
        <div className="mb-6 rounded-md border border-neutral-800 bg-neutral-900/50 p-4">
          <p className="mb-1 font-mono text-xs uppercase tracking-wider text-neutral-500">
            Budget request
          </p>
          <p className="text-lg text-neutral-100">
            ${(proposal.budget_request_cents / 100).toFixed(2)}
          </p>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="rounded-md border border-neutral-800 bg-neutral-900/50 p-5">
          <p className="mb-3 font-mono text-xs uppercase tracking-wider text-neutral-500">
            Votes ({total} weighted)
          </p>
          <div className="mb-2 flex gap-4 font-mono text-sm">
            <span className="text-green-500">
              For: {proposal.votes_for}
            </span>
            <span className="text-red-400">
              Against: {proposal.votes_against}
            </span>
          </div>
          {total > 0 && (
            <div className="h-2 overflow-hidden rounded-full bg-red-500/30">
              <div
                className="h-full rounded-full bg-green-500"
                style={{ width: `${forPct}%` }}
              />
            </div>
          )}
        </div>

        <div className="rounded-md border border-neutral-800 bg-neutral-900/50 p-5">
          <p className="mb-3 font-mono text-xs uppercase tracking-wider text-neutral-500">
            Quorum ({voterCount} / {quorumSize} voters)
          </p>
          <div className="mb-2 text-sm">
            {quorumMet ? (
              <span className="text-green-400">Quorum reached</span>
            ) : (
              <span className="text-neutral-400">
                {quorumSize - voterCount} more voter{quorumSize - voterCount !== 1 ? "s" : ""} needed
              </span>
            )}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-neutral-800">
            <div
              className={`h-full rounded-full transition-all ${
                quorumMet ? "bg-green-500" : "bg-amber-500"
              }`}
              style={{ width: `${quorumPct}%` }}
            />
          </div>
        </div>
      </div>

      {proposal.status === "open" && profile && (
        <div className="mb-6 rounded-md border border-neutral-800 bg-neutral-900/50 p-5">
          <VoteButtons
            proposalId={proposal.id}
            userId={profile.id}
            existingChoice={existingVote?.choice ?? null}
          />
        </div>
      )}

      {allVotes && allVotes.length > 0 && (
        <div>
          <p className="mb-3 font-mono text-xs uppercase tracking-wider text-neutral-500">
            Vote log
          </p>
          <div className="space-y-1">
            {allVotes.map((v: any) => (
              <div
                key={v.id}
                className="flex items-center justify-between rounded px-3 py-2 text-sm"
              >
                <span className="text-neutral-300">
                  {v.users?.display_name}
                </span>
                <div className="flex items-center gap-3">
                  <span
                    className={`font-mono text-xs ${
                      v.choice === "for"
                        ? "text-green-500"
                        : v.choice === "against"
                          ? "text-red-400"
                          : "text-neutral-500"
                    }`}
                  >
                    {v.choice}
                  </span>
                  {v.weight > 1 && (
                    <span className="rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-400">
                      {v.weight}x
                    </span>
                  )}
                  <span className="text-xs text-neutral-600">
                    {new Date(v.cast_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
