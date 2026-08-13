import { createClient, createServiceClient } from "@/lib/supabase-server";
import { notFound, redirect } from "next/navigation";
import { VoteButtons } from "./vote-buttons";
import {
  Glass,
  StatusChip,
  VoteTally,
  VoteBar,
  type StatusChipVariant,
} from "@loop/ui";

const STATUS_VARIANT: Record<string, StatusChipVariant> = {
  open: "warning",
  approved: "success",
  rejected: "error",
};

export default async function ProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: proposal } = await admin
    .from("proposals")
    .select(
      `*,
      users!proposals_author_id_fkey(display_name, email),
      communities!proposals_community_id_fkey(name, slug, quorum_size, path, level)`
    )
    .eq("id", id)
    .single();

  if (!proposal) notFound();

  const { data: profile } = await admin
    .from("users")
    .select("id, platform_role")
    .eq("auth_id", user.id)
    .single();

  const isPlatformAdmin = profile?.platform_role === "platform_admin";

  // Non-admins can only see proposals in subjects they belong to
  if (profile && !isPlatformAdmin) {
    const proposalCommunityId = proposal.community_id;
    const { data: proposalCommunity } = await admin
      .from("communities")
      .select("subject")
      .eq("id", proposalCommunityId)
      .single();

    if (proposalCommunity) {
      const { data: userSubjectCommunities } = await admin
        .from("community_memberships")
        .select("communities!inner(subject)")
        .eq("user_id", profile.id);

      const userSubjects = new Set(
        (userSubjectCommunities ?? []).map((m: any) => m.communities?.subject)
      );

      if (!userSubjects.has(proposalCommunity.subject)) {
        notFound();
      }
    }
  }

  const { data: existingVote } = profile
    ? await admin
        .from("votes")
        .select("id, choice")
        .eq("proposal_id", id)
        .eq("voter_id", profile.id)
        .single()
    : { data: null };

  // Check voting eligibility
  const isDirectDemocracy = proposal.direct_democracy ?? false;
  let canVote = false;
  if (profile) {
    if (isDirectDemocracy) {
      const communityPath = proposal.communities?.path ?? "";
      const { data: memberships } = await admin
        .from("community_memberships")
        .select("community_id, communities!inner(path)")
        .eq("user_id", profile.id);
      canVote = (memberships ?? []).some((m: any) => {
        const mPath: string = m.communities?.path ?? "";
        return mPath === communityPath || mPath.startsWith(communityPath + ".");
      });
    } else {
      const { data: membership } = await admin
        .from("community_memberships")
        .select("role")
        .eq("user_id", profile.id)
        .eq("community_id", proposal.community_id)
        .single();
      canVote = !!membership && ["quorum", "admin"].includes(membership.role);
    }
  }

  const { data: allVotes } = await admin
    .from("votes")
    .select(
      `id, choice, weight, cast_at,
      users!votes_voter_id_fkey(display_name)`
    )
    .eq("proposal_id", id)
    .order("cast_at", { ascending: false });

  if (
    proposal.status === "open" &&
    proposal.closes_at &&
    new Date(proposal.closes_at) <= new Date()
  ) {
    await admin.rpc("evaluate_proposal", { p_id: id });
    const { data: updated } = await admin
      .from("proposals")
      .select("status")
      .eq("id", id)
      .single();
    if (updated) proposal.status = updated.status;
  }

  const total = proposal.votes_for + proposal.votes_against;
  const voterCount = allVotes?.length ?? 0;
  const quorumSize = (proposal as any).communities?.quorum_size ?? 10;
  const quorumMet = voterCount >= quorumSize;
  const quorumPct = Math.min((voterCount / quorumSize) * 100, 100);

  return (
    <div className="max-w-3xl">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <StatusChip variant={STATUS_VARIANT[proposal.status] ?? "neutral"}>
          {proposal.status}
        </StatusChip>
        <span className="text-caption text-text-secondary">
          {proposal.communities?.name}
        </span>
        {isDirectDemocracy && <StatusChip variant="neutral">Direct democracy</StatusChip>}
        {proposal.budget_request_cents != null && proposal.budget_request_cents > 0 && proposal.proposal_type === "standard" && (
          <StatusChip variant="neutral">Budget allocation</StatusChip>
        )}
        {proposal.proposal_type === "regional_cascade" && (
          <StatusChip variant="neutral">Regional cascade</StatusChip>
        )}
        {proposal.proposal_type === "treasury_distribution" && (
          <StatusChip variant="neutral">Treasury distribution</StatusChip>
        )}
        {proposal.disbursed_at && <StatusChip variant="success">Disbursed</StatusChip>}
      </div>

      <h1 className="mb-2 text-h1 font-bold tracking-tight text-text-primary">
        {proposal.title}
      </h1>

      <p className="mb-6 text-caption text-text-secondary">
        by {proposal.users?.display_name} on{" "}
        {new Date(proposal.created_at).toLocaleDateString()}
        {proposal.closes_at && (
          <>
            {" "}/ voting closes{" "}
            {new Date(proposal.closes_at).toLocaleDateString()}
          </>
        )}
      </p>

      <div className="mb-6 whitespace-pre-wrap text-body leading-relaxed text-text-secondary">
        {proposal.description}
      </div>

      {proposal.consequence && (
        <Glass className="mb-6 p-4">
          <h2 className="mb-2 text-caption font-medium uppercase tracking-wider text-text-secondary">
            If approved
          </h2>
          <p className="text-body text-text-primary">{proposal.consequence}</p>
        </Glass>
      )}

      {proposal.proposal_type === "regional_cascade" && proposal.cascade_allocations && (
        <Glass className="mb-6 p-4">
          <h2 className="mb-2 text-caption font-medium uppercase tracking-wider text-text-secondary">
            Regional cascade
          </h2>
          <p className="font-mono text-h2 font-bold text-text-primary">
            {Number((proposal.cascade_allocations as any).amount ?? 0).toLocaleString()} LOOP_TKN
          </p>
          <ul className="mt-3 space-y-1 text-body">
            {((proposal.cascade_allocations as any).splits ?? []).map((s: any, i: number) => (
              <li key={i} className="flex items-center justify-between text-text-secondary">
                <span className="font-mono text-caption">{String(s.child_community_id).slice(0, 8)}…</span>
                <span className="font-mono tabular-nums">{s.pct}%</span>
              </li>
            ))}
          </ul>
          {proposal.disbursed_at ? (
            <p className="mt-3 text-caption text-success">
              Cascaded on {new Date(proposal.disbursed_at).toLocaleDateString()}. Voters were compensated from the motivation pool.
            </p>
          ) : proposal.status === "approved" ? (
            <p className="mt-3 text-caption text-warning">
              Approved but not yet cascaded. Usually means the community treasury has insufficient balance for the total.
            </p>
          ) : (
            <p className="mt-3 text-caption text-text-secondary">
              If approved, funds will cascade automatically to the listed children.
            </p>
          )}
        </Glass>
      )}

      {proposal.proposal_type === "treasury_distribution" && proposal.distribution_amount != null && (
        <Glass className="mb-6 p-4">
          <h2 className="mb-2 text-caption font-medium uppercase tracking-wider text-text-secondary">
            Treasury distribution
          </h2>
          <p className="font-mono text-h2 font-bold text-text-primary">
            {Number(proposal.distribution_amount).toLocaleString()} LOOP_TKN
          </p>
          {proposal.disbursed_at ? (
            <p className="mt-2 text-caption text-success">
              Distributed on {new Date(proposal.disbursed_at).toLocaleDateString()} per the community&apos;s leader / participant / delegator rules.
            </p>
          ) : proposal.status === "approved" ? (
            <p className="mt-2 text-caption text-warning">
              Approved but not yet distributed.
            </p>
          ) : (
            <p className="mt-2 text-caption text-text-secondary">
              If approved, this amount will be distributed to members per the community&apos;s distribution rules.
            </p>
          )}
        </Glass>
      )}

      {proposal.budget_request_cents != null && proposal.budget_request_cents > 0 && proposal.proposal_type === "standard" && (
        <Glass className="mb-6 p-4">
          <h2 className="mb-2 text-caption font-medium uppercase tracking-wider text-text-secondary">
            Budget request
          </h2>
          <p className="font-mono text-h2 font-bold text-text-primary">
            ${(proposal.budget_request_cents / 100).toFixed(2)}
          </p>
          {proposal.disbursed_at ? (
            <p className="mt-2 text-caption text-success">
              Disbursed on{" "}
              {new Date(proposal.disbursed_at).toLocaleDateString()} to{" "}
              {proposal.users?.display_name ?? "author"}. Voters were
              compensated from the governance motivation pool.
            </p>
          ) : proposal.status === "approved" ? (
            <p className="mt-2 text-caption text-warning">
              Approved but not yet disbursed. This usually means the
              community treasury does not have sufficient balance.
            </p>
          ) : (
            <p className="mt-2 text-caption text-text-secondary">
              If approved, funds will be disbursed automatically from the
              community treasury to the author.
            </p>
          )}
        </Glass>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4">
        <Glass className="p-4">
          <h2 className="mb-2 text-caption font-medium uppercase tracking-wider text-text-secondary">
            Votes ({total} weighted)
          </h2>
          <VoteTally
            votesFor={proposal.votes_for}
            votesAgainst={proposal.votes_against}
            labeled
            className="mb-2"
          />
          {total > 0 && (
            <VoteBar votesFor={proposal.votes_for} votesAgainst={proposal.votes_against} />
          )}
        </Glass>

        <Glass className="p-4">
          <h2 className="mb-2 text-caption font-medium uppercase tracking-wider text-text-secondary">
            Participation ({voterCount} / {quorumSize} voters)
          </h2>
          <div className="mb-2 text-body">
            {quorumMet ? (
              <span className="text-success">Threshold reached</span>
            ) : (
              <span className="text-text-secondary">
                {quorumSize - voterCount} more voter
                {quorumSize - voterCount !== 1 ? "s" : ""} needed
              </span>
            )}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-[var(--duration-vote-bar)] ease-[var(--ease-vote-bar)]"
              style={{ width: `${quorumPct}%` }}
            />
          </div>
        </Glass>
      </div>

      {proposal.status === "open" && profile && canVote && (
        <div className="mb-6">
          <VoteButtons
            proposalId={proposal.id}
            userId={profile.id}
            existingChoice={existingVote?.choice ?? null}
          />
        </div>
      )}

      {proposal.status === "open" && profile && !canVote && !existingVote && (
        <Glass className="mb-6 p-4">
          <p className="text-body text-text-secondary">
            {isDirectDemocracy
              ? "You are not a member of this community or its sub-communities."
              : "Only leadership group members at this level can vote on this proposal."}
          </p>
        </Glass>
      )}

      {allVotes && allVotes.length > 0 && (
        <div>
          <p className="mb-3 text-caption font-medium uppercase tracking-wider text-text-secondary">
            Vote log
          </p>
          <Glass className="divide-y divide-surface-border p-0">
            {allVotes.map((v: any) => (
              <div
                key={v.id}
                className="flex items-center justify-between px-4 py-2.5 text-body"
              >
                <span className="text-text-primary">{v.users?.display_name}</span>
                <div className="flex items-center gap-3">
                  <span
                    className={`font-mono text-caption ${
                      v.choice === "for"
                        ? "text-success"
                        : v.choice === "against"
                          ? "text-error"
                          : "text-text-secondary"
                    }`}
                  >
                    {v.choice}
                  </span>
                  {v.weight > 1 && (
                    <StatusChip variant="neutral">{v.weight}x</StatusChip>
                  )}
                  <span className="text-caption text-text-secondary">
                    {new Date(v.cast_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </Glass>
        </div>
      )}
    </div>
  );
}
