import { createServiceClient, createClient } from "@/lib/supabase-server";
import { getActiveSubject } from "@/lib/subject";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardChat } from "./dashboard-chat";
import { sendMessage } from "./communities/[id]/chat/actions";

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

  // Load messages for user's communities
  let chatMessages: any[] = [];
  const firstCommunityId =
    userCommunities.length > 0 ? userCommunities[0].id : null;

  if (firstCommunityId) {
    const { data: msgs } = await admin
      .from("messages")
      .select(
        `id, content, channel, created_at,
        author:users!messages_author_id_fkey(id, display_name)`
      )
      .eq("community_id", firstCommunityId)
      .order("created_at", { ascending: true })
      .limit(100);

    chatMessages = (msgs ?? []).map((m: any) => ({
      ...m,
      community_name: userCommunities.find((c) => c.id === firstCommunityId)
        ?.name,
    }));
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
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        {SUBJECT_LABELS[activeSubject] ?? activeSubject}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Join the conversation and shape {activeSubject} governance
      </p>

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chat - the main feature */}
      {userCommunities.length > 0 ? (
        <div className="mb-6">
          <DashboardChat
            communities={userCommunities}
            initialMessages={chatMessages}
            initialCommunityId={firstCommunityId}
            sendMessageAction={sendMessage}
          />
        </div>
      ) : (
        <Card className="mb-6">
          <CardContent className="py-8 text-center">
            <p className="mb-2 text-sm text-muted-foreground">
              Join a community to see conversations here
            </p>
            <Link
              href="/communities"
              className="text-sm font-medium text-primary hover:underline"
            >
              Browse communities
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Recent proposals */}
      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Recent proposals
        </h2>
        {recentProposals && recentProposals.length > 0 ? (
          <div className="space-y-2">
            {recentProposals.map((p) => (
              <Link key={p.id} href={`/proposals/${p.id}`}>
                <Card className="transition hover:border-primary/30">
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{p.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
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
                      <Badge
                        variant={
                          p.status === "open"
                            ? "default"
                            : p.status === "approved"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {p.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No proposals yet. Create one to get started.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
