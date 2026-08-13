import { createClient, createServiceClient } from "@/lib/supabase-server";
import { getActiveSubject } from "@/lib/subject";
import { redirect } from "next/navigation";
import { PowerTree } from "./power-tree";
import { Glass, StatTile, StatusChip, AccreditationProgress } from "@loop/ui";

type DelegationRow = {
  delegator_id: string;
  delegate_id: string;
  community_id: string;
  subject_tag: string;
};

function buildPowerTree(
  targetUserId: string,
  delegations: DelegationRow[],
  communityId: string
) {
  type TreeNode = {
    userId: string;
    name: string;
    depth: number;
    children: TreeNode[];
  };

  const inbound = delegations.filter(
    (d) => d.community_id === communityId
  );

  function getUpstream(userId: string, depth: number, visited: Set<string>): TreeNode[] {
    if (depth > 10) return [];
    const delegators = inbound.filter((d) => d.delegate_id === userId);
    return delegators
      .filter((d) => !visited.has(d.delegator_id))
      .map((d) => {
        visited.add(d.delegator_id);
        return {
          userId: d.delegator_id,
          name: "",
          depth,
          children: getUpstream(d.delegator_id, depth + 1, visited),
        };
      });
  }

  const visited = new Set([targetUserId]);
  return getUpstream(targetUserId, 1, visited);
}

function countTreeNodes(nodes: any[]): number {
  let count = 0;
  for (const n of nodes) {
    count += 1 + countTreeNodes(n.children);
  }
  return count;
}

export default async function AccreditationPage() {
  const supabase = await createClient();
  const admin = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await admin
    .from("users")
    .select("id, display_name")
    .eq("auth_id", user.id)
    .single();

  if (!profile) redirect("/");

  const activeSubject = await getActiveSubject();

  // Get communities for this subject
  const { data: subjectCommunities } = await admin
    .from("communities")
    .select("id")
    .eq("subject", activeSubject);
  const subjectCommunityIds = (subjectCommunities ?? []).map((c: any) => c.id);

  const { data: allDelegations } = await admin
    .from("delegations")
    .select("delegator_id, delegate_id, community_id, subject_tag")
    .eq("active", true)
    .eq("subject_tag", activeSubject);

  const { data: myMemberships } = await admin
    .from("community_memberships")
    .select("community_id, role, communities(id, name, level, subject, quorum_size, quorum_threshold_pct)")
    .eq("user_id", profile.id)
    .in("community_id", subjectCommunityIds.length > 0 ? subjectCommunityIds : ["none"]);

  const { data: allUsers } = await admin
    .from("users")
    .select("id, display_name");

  const userMap: Record<string, string> = {};
  for (const u of allUsers ?? []) {
    userMap[u.id] = u.display_name;
  }

  const delegations = allDelegations ?? [];
  const memberships = myMemberships ?? [];

  const communityPower: {
    communityId: string;
    communityName: string;
    level: string;
    subject: string;
    role: string;
    quorumSize: number;
    thresholdPct: number;
    myVotes: number;
    totalMembers: number;
    tree: any[];
  }[] = [];

  for (const m of memberships) {
    const comm = (m as any).communities;
    if (!comm) continue;

    const tree = buildPowerTree(profile.id, delegations, comm.id);
    const myVotes = 1 + countTreeNodes(tree);

    const { count } = await admin
      .from("community_memberships")
      .select("id", { count: "exact", head: true })
      .eq("community_id", comm.id);

    function labelTree(nodes: any[]): any[] {
      return nodes.map((n: any) => ({
        ...n,
        name: userMap[n.userId] ?? "Unknown",
        children: labelTree(n.children),
      }));
    }

    communityPower.push({
      communityId: comm.id,
      communityName: comm.name,
      level: comm.level,
      subject: comm.subject,
      role: m.role,
      quorumSize: comm.quorum_size,
      thresholdPct: parseFloat(comm.quorum_threshold_pct),
      myVotes,
      totalMembers: count ?? 0,
      tree: labelTree(tree),
    });
  }

  communityPower.sort((a, b) => {
    const order = { global: 0, continental: 1, national: 2, city: 3 };
    return (order[a.level as keyof typeof order] ?? 4) - (order[b.level as keyof typeof order] ?? 4);
  });

  const quorumCommunities = communityPower.filter(
    (c) => c.role === "quorum" || c.role === "admin"
  );

  const totalVotePower = communityPower.reduce((sum, c) => sum + c.myVotes, 0);

  return (
    <div className="max-w-5xl">
      <h1 className="mb-1 text-h1 font-bold tracking-tight text-text-primary">
        My Power
      </h1>
      <p className="mb-8 text-body text-text-secondary">
        Your accumulated voting power across the governance network. Power flows
        to you through delegation chains.
      </p>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <StatTile
          label="Total vote power"
          value={totalVotePower}
          valueClassName="text-primary"
        />
        <StatTile label="Leadership seats" value={quorumCommunities.length} />
        <StatTile
          label="Direct delegators"
          value={delegations.filter((d) => d.delegate_id === profile.id).length}
        />
      </div>
      <div className="-mt-6 mb-8 grid grid-cols-3 gap-4 text-caption text-text-secondary">
        <p>across {communityPower.length} communities</p>
        <p>leadership positions held</p>
        <p>people directly trusting you</p>
      </div>

      {quorumCommunities.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-caption font-medium uppercase tracking-wider text-text-secondary">
            Leadership group positions
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {quorumCommunities.map((c) => (
              <Glass key={c.communityId} className="flex items-center justify-between p-3">
                <div>
                  <span className="text-body font-medium text-text-primary">{c.communityName}</span>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <StatusChip variant="neutral">{c.level}</StatusChip>
                    <StatusChip variant="neutral">{c.subject}</StatusChip>
                  </div>
                </div>
                <StatusChip variant="success">{c.role}</StatusChip>
              </Glass>
            ))}
          </div>
        </div>
      )}

      <div className="mb-8">
        <h2 className="mb-3 text-caption font-medium uppercase tracking-wider text-text-secondary">
          Power by community
        </h2>
        <div className="space-y-4">
          {communityPower.map((c) => {
            const hasSeat = c.role === "quorum" || c.role === "admin";
            return (
              <Glass key={c.communityId} className="p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-body font-medium text-text-primary">{c.communityName}</h3>
                    <StatusChip variant="neutral">{c.level}</StatusChip>
                    <StatusChip variant="neutral">{c.subject}</StatusChip>
                    {hasSeat && <StatusChip variant="success">{c.role}</StatusChip>}
                  </div>
                </div>
                <AccreditationProgress
                  votes={c.myVotes}
                  totalMembers={c.totalMembers}
                  thresholdPct={c.thresholdPct}
                  hasSeat={hasSeat}
                  className="mb-3"
                />
                {c.tree.length > 0 ? (
                  <PowerTree tree={c.tree} />
                ) : (
                  <p className="text-caption text-text-secondary">
                    No delegations flowing to you in this community yet.
                  </p>
                )}
              </Glass>
            );
          })}
        </div>
      </div>
    </div>
  );
}
