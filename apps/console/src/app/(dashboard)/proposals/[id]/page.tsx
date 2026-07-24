import { createClient, createServiceClient } from "@/lib/supabase-server";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { VoteButtons } from "./vote-buttons";

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
  const forPct = total > 0 ? (proposal.votes_for / total) * 100 : 0;
  const voterCount = allVotes?.length ?? 0;
  const quorumSize = (proposal as any).communities?.quorum_size ?? 10;
  const quorumMet = voterCount >= quorumSize;
  const quorumPct = Math.min((voterCount / quorumSize) * 100, 100);

  return (
    <div className="max-w-3xl">
      <div className="mb-1 flex items-center gap-2">
        <Badge
          variant={
            proposal.status === "open"
              ? "default"
              : proposal.status === "approved"
                ? "secondary"
                : proposal.status === "rejected"
                  ? "destructive"
                  : "outline"
          }
        >
          {proposal.status}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {proposal.communities?.name}
        </span>
        {isDirectDemocracy && (
          <Badge variant="secondary" className="text-[10px]">
            Direct democracy
          </Badge>
        )}
      </div>

      <h1 className="mb-2 text-2xl font-semibold tracking-tight">
        {proposal.title}
      </h1>

      <p className="mb-6 text-xs text-muted-foreground">
        by {proposal.users?.display_name} on{" "}
        {new Date(proposal.created_at).toLocaleDateString()}
        {proposal.closes_at && (
          <>
            {" "}/ voting closes{" "}
            {new Date(proposal.closes_at).toLocaleDateString()}
          </>
        )}
      </p>

      <div className="mb-6 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
        {proposal.description}
      </div>

      {proposal.consequence && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              If approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{proposal.consequence}</p>
          </CardContent>
        </Card>
      )}

      {proposal.budget_request_cents != null && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Budget request
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              ${(proposal.budget_request_cents / 100).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Votes ({total} weighted)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-2 flex gap-4 font-mono text-sm">
              <span className="text-green-500">For: {proposal.votes_for}</span>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Participation ({voterCount} / {quorumSize} voters)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-2 text-sm">
              {quorumMet ? (
                <span className="text-green-500">Threshold reached</span>
              ) : (
                <span className="text-muted-foreground">
                  {quorumSize - voterCount} more voter
                  {quorumSize - voterCount !== 1 ? "s" : ""} needed
                </span>
              )}
            </div>
            <Progress value={quorumPct} className="h-2" />
          </CardContent>
        </Card>
      </div>

      {proposal.status === "open" && profile && canVote && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <VoteButtons
              proposalId={proposal.id}
              userId={profile.id}
              existingChoice={existingVote?.choice ?? null}
            />
          </CardContent>
        </Card>
      )}

      {proposal.status === "open" && profile && !canVote && !existingVote && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              {isDirectDemocracy
                ? "You are not a member of this community or its sub-communities."
                : "Only leadership group members at this level can vote on this proposal."}
            </p>
          </CardContent>
        </Card>
      )}

      {allVotes && allVotes.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Vote log
          </p>
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {allVotes.map((v: any) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between px-4 py-2.5 text-sm"
                >
                  <span>{v.users?.display_name}</span>
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-mono text-xs ${
                        v.choice === "for"
                          ? "text-green-500"
                          : v.choice === "against"
                            ? "text-red-400"
                            : "text-muted-foreground"
                      }`}
                    >
                      {v.choice}
                    </span>
                    {v.weight > 1 && (
                      <Badge variant="secondary" className="text-[10px]">
                        {v.weight}x
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(v.cast_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
