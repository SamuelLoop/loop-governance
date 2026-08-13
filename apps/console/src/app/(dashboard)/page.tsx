import { createServiceClient, createClient } from "@/lib/supabase-server";
import { getActiveSubject } from "@/lib/subject";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getMessages } from "./communities/[id]/chat/actions";
import { getQuestions } from "./communities/[id]/chat/question-actions";
import { getReactions } from "./communities/[id]/chat/reaction-actions";
import { DualChatPanel } from "./communities/[id]/chat/dual-chat-panel";
import { QuestionPanel } from "./communities/[id]/chat/question-panel";
import { ChatMobileLayout } from "./communities/[id]/chat/chat-mobile-layout";
import { Glass, StatTile, StatusChip, type StatusChipVariant } from "@loop/ui";

const PROPOSAL_STATUS_VARIANT: Record<string, StatusChipVariant> = {
  open: "warning",
  approved: "success",
  rejected: "error",
};

const SUBJECT_LABELS: Record<string, string> = {
  governance: "Governance",
  economics: "Economics",
  ecology: "Ecology",
  health: "Health",
  technology: "Technology",
  education: "Education",
  culture: "Culture",
  infrastructure: "Infrastructure",
  justice: "Justice",
  energy: "Energy",
};

export default async function DashboardPage() {
  const admin = createServiceClient();
  const supabase = await createClient();
  const activeSubject = await getActiveSubject();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await admin
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  const userId = profile?.id;

  const { data: subjectCommunities } = await admin
    .from("communities")
    .select("id, name, level")
    .eq("subject", activeSubject);
  const allCommunities = subjectCommunities ?? [];
  const ids = allCommunities.map((c: any) => c.id);
  const safeIds = ids.length > 0 ? ids : ["none"];

  // Get communities the user is a member of
  let userCommunities: { id: string; name: string; level: string }[] = [];
  if (userId) {
    const { data: memberships } = await admin
      .from("community_memberships")
      .select("community_id")
      .eq("user_id", userId);

    const memberCommunityIds = new Set(
      (memberships ?? []).map((m: any) => m.community_id)
    );
    userCommunities = allCommunities.filter((c: any) =>
      memberCommunityIds.has(c.id)
    );
  }

  // Full chat for the user's default (first) community — same
  // community/leadership/questions experience as
  // communities/[id]/chat/page.tsx, embedded here as the dashboard's
  // default chat view instead of a lighter-weight widget.
  const firstCommunityId =
    userCommunities.length > 0 ? userCommunities[0].id : null;

  let isQuorum = false;
  let communityMessages: Awaited<ReturnType<typeof getMessages>> = [];
  let quorumMessages: Awaited<ReturnType<typeof getMessages>> = [];
  let questions: Awaited<ReturnType<typeof getQuestions>> = [];
  let communityReactions: Awaited<ReturnType<typeof getReactions>> = {};
  let quorumReactions: Awaited<ReturnType<typeof getReactions>> = {};

  if (firstCommunityId && userId) {
    const { data: membership } = await admin
      .from("community_memberships")
      .select("role")
      .eq("user_id", userId)
      .eq("community_id", firstCommunityId)
      .single();
    isQuorum = !!membership && ["quorum", "admin"].includes(membership.role);

    [communityMessages, quorumMessages, questions] = await Promise.all([
      getMessages(firstCommunityId, "community"),
      getMessages(firstCommunityId, "quorum"),
      getQuestions(firstCommunityId),
    ]);

    [communityReactions, quorumReactions] = await Promise.all([
      getReactions(communityMessages.map((m) => m.id)),
      getReactions(quorumMessages.map((m) => m.id)),
    ]);
  }

  const [
    { count: communityCount },
    { count: memberCount },
    { count: proposalCount },
    { count: openProposalCount },
  ] = await Promise.all([
    admin
      .from("communities")
      .select("*", { count: "exact", head: true })
      .eq("subject", activeSubject),
    admin
      .from("community_memberships")
      .select("*", { count: "exact", head: true })
      .in("community_id", safeIds),
    admin
      .from("proposals")
      .select("*", { count: "exact", head: true })
      .in("community_id", safeIds),
    admin
      .from("proposals")
      .select("*", { count: "exact", head: true })
      .eq("status", "open")
      .in("community_id", safeIds),
  ]);

  const { data: recentProposals } = await admin
    .from("proposals")
    .select("id, title, status, created_at, votes_for, votes_against")
    .in("community_id", safeIds)
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
      <h1 className="mb-1 text-h1 font-bold tracking-tight text-text-primary">
        {SUBJECT_LABELS[activeSubject] ?? activeSubject}
      </h1>
      <p className="mb-6 text-body text-text-secondary">
        Join the conversation and shape {activeSubject} governance
      </p>

      {/* Stats row — none of these are Realtime-backed (one-shot count
          queries per request), so no StatTile `live` prop per the
          "verify before adding, don't fake liveness" rule. */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <StatTile key={s.label} label={s.label} value={s.value} />
        ))}
      </div>

      {/* Chat - the main feature. Full community/leadership/questions
          experience for the user's default community, same composition
          as communities/[id]/chat/page.tsx (not a lighter-weight
          embedded widget). */}
      {firstCommunityId ? (
        <div className="mb-6 flex h-[calc(100vh-16rem)] flex-col overflow-hidden">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-caption text-text-secondary">
              {userCommunities[0]?.name}
            </p>
            {userCommunities.length > 1 && (
              <Link
                href="/communities"
                className="text-caption text-text-secondary hover:text-text-primary hover:underline"
              >
                View other communities
              </Link>
            )}
          </div>
          {/* Desktop: side-by-side panels */}
          <div className="hidden flex-1 gap-3 overflow-hidden md:flex">
            <div className="flex flex-[2] overflow-hidden">
              <DualChatPanel
                communityId={firstCommunityId}
                communityMessages={communityMessages}
                quorumMessages={quorumMessages}
                isQuorum={isQuorum}
                communityReactions={communityReactions}
                quorumReactions={quorumReactions}
              />
            </div>
            <div className="flex w-80 shrink-0 flex-col overflow-hidden">
              <QuestionPanel
                communityId={firstCommunityId}
                questions={questions}
                isQuorum={isQuorum}
              />
            </div>
          </div>

          {/* Mobile: tabbed layout */}
          <ChatMobileLayout
            communityId={firstCommunityId}
            communityMessages={communityMessages}
            quorumMessages={quorumMessages}
            questions={questions}
            isQuorum={isQuorum}
            communityReactions={communityReactions}
            quorumReactions={quorumReactions}
          />
        </div>
      ) : (
        <Glass space="community" className="mb-6 py-8 text-center">
          <p className="mb-2 text-body text-text-secondary">
            Join a community to see conversations here
          </p>
          <Link
            href="/communities"
            className="text-body font-medium text-primary hover:underline"
          >
            Browse communities
          </Link>
        </Glass>
      )}

      {/* Recent proposals */}
      <div>
        <h2 className="mb-3 text-caption font-medium uppercase tracking-wider text-text-secondary">
          Recent proposals
        </h2>
        {recentProposals && recentProposals.length > 0 ? (
          <div className="space-y-2">
            {recentProposals.map((p) => (
              <Link key={p.id} href={`/proposals/${p.id}`}>
                <Glass className="flex items-center justify-between px-4 py-3 transition-colors hover:border-primary/30">
                  <div>
                    <p className="text-body font-medium text-text-primary">{p.title}</p>
                    <p className="mt-0.5 text-caption text-text-secondary">
                      {new Date(p.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-data-sm text-success">
                      +{p.votes_for}
                    </span>
                    <span className="font-mono text-data-sm text-error">
                      -{p.votes_against}
                    </span>
                    <StatusChip variant={PROPOSAL_STATUS_VARIANT[p.status] ?? "neutral"}>
                      {p.status}
                    </StatusChip>
                  </div>
                </Glass>
              </Link>
            ))}
          </div>
        ) : (
          <Glass className="py-8 text-center text-body text-text-secondary">
            No proposals yet. Create one to get started.
          </Glass>
        )}
      </div>
    </div>
  );
}
