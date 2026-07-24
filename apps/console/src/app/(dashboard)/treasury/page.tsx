import { createServiceClient } from "@/lib/supabase-server";
import { getSubjectCommunityIds } from "@/lib/subject";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getDistributionRules,
  getTreasuryBalance,
  getPlatformPool,
  getRegionalAllocations,
} from "./actions";
import { RulesForm } from "./rules-form";
import { InflowForm } from "./inflow-form";
import { DistributeForm } from "./distribute-form";
import { CascadeForm } from "./cascade-form";
import { FundingRequestForm } from "./funding-request-form";
import { ApproveButton, RejectButton } from "./approve-button";
import { CollapsibleNode } from "./collapsible-node";

const LEVEL_LABELS: Record<string, string> = {
  global: "Global",
  continental: "Continental",
  national: "National",
  city: "City",
  local: "Local",
};

const LEVEL_ORDER = ["global", "continental", "national", "city", "local"];

const SUBJECT_LABELS: Record<string, string> = {
  governance: "Governance",
  economics: "Economics",
  ecology: "Ecology",
  health: "Health",
  technology: "Technology",
  education: "Education",
  culture: "Arts & Culture",
  agriculture: "Agriculture",
  energy: "Energy",
  housing: "Housing",
};

type EnrichedCommunity = {
  id: string;
  name: string;
  slug: string;
  level: string;
  subject?: string;
  parent_id: string | null;
  governanceSplit: number;
  maxGovernanceCap: number;
  rules: Awaited<ReturnType<typeof getDistributionRules>>;
  balance: Awaited<ReturnType<typeof getTreasuryBalance>>;
  allocations: Awaited<ReturnType<typeof getRegionalAllocations>>;
  proposalCount: number;
  requestedFunds: number;
  children: EnrichedCommunity[];
};

function buildTree(
  communities: EnrichedCommunity[]
): EnrichedCommunity[] {
  const byId = new Map<string, EnrichedCommunity>();
  for (const c of communities) byId.set(c.id, c);

  const roots: EnrichedCommunity[] = [];
  for (const c of communities) {
    if (c.parent_id && byId.has(c.parent_id)) {
      byId.get(c.parent_id)!.children.push(c);
    } else {
      roots.push(c);
    }
  }
  return roots;
}

function getTotalProposals(community: EnrichedCommunity): number {
  return community.proposalCount + community.children.reduce((s, c) => s + getTotalProposals(c), 0);
}

function getTotalRequested(community: EnrichedCommunity): number {
  return community.requestedFunds + community.children.reduce((s, c) => s + getTotalRequested(c), 0);
}

function CommunityNode({
  community,
  depth,
}: {
  community: EnrichedCommunity;
  depth: number;
}) {
  const bal = Number(community.balance.balance);
  const hasChildren = community.children.length > 0;
  const allocationTotal = community.allocations.reduce(
    (s, a) => s + Number(a.allocation_pct),
    0
  );
  const totalProposals = getTotalProposals(community);
  const totalRequested = getTotalRequested(community);

  const nodeContent = (
    <Card className="mb-4">
      <CardContent className="pt-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            {community.balance.inflow_count} inflows / {community.balance.outflow_count} outflows
          </p>
        </div>

        {/* Regional allocation bar */}
        {hasChildren && community.allocations.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Regional allocation to sub-communities
            </p>
            <div className="mb-2 flex h-3 overflow-hidden rounded-full bg-muted">
              {community.allocations.map((a) => (
                <div
                  key={a.child.id}
                  className="bg-primary/70 first:rounded-l-full last:rounded-r-full"
                  style={{ width: `${a.allocation_pct}%` }}
                  title={`${a.child.name}: ${a.allocation_pct}%`}
                />
              ))}
              {allocationTotal < 100 && (
                <div
                  className="bg-amber-500/30"
                  style={{ width: `${100 - allocationTotal}%` }}
                  title={`Retained: ${(100 - allocationTotal).toFixed(1)}%`}
                />
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              {community.allocations.map((a) => (
                <span key={a.child.id}>
                  {a.child.name}: {a.allocation_pct}%
                </span>
              ))}
              {allocationTotal < 100 && (
                <span className="text-amber-500">
                  Retained: {(100 - allocationTotal).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        )}

        {/* Project vs Governance split */}
        <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-amber-400">Funding split</p>
            <p className="text-[10px] text-muted-foreground">
              Max governance cap: {community.maxGovernanceCap}%
            </p>
          </div>
          <div className="mb-1 flex h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="bg-emerald-500/70 rounded-l-full"
              style={{ width: `${100 - community.governanceSplit}%` }}
              title={`Projects: ${100 - community.governanceSplit}%`}
            />
            <div
              className="bg-primary/70 rounded-r-full"
              style={{ width: `${community.governanceSplit}%` }}
              title={`Governance: ${community.governanceSplit}%`}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span className="text-emerald-400">
              Projects: {100 - community.governanceSplit}%
            </span>
            <span className="text-primary">
              Governance: {community.governanceSplit}%
            </span>
          </div>
        </div>

        <div className={`grid gap-6 ${hasChildren ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
          <div>
            <h3 className="mb-1 text-xs font-medium">Governance split</h3>
            <p className="mb-2 text-[11px] text-muted-foreground">
              How the governance portion ({community.governanceSplit}%) is
              divided between leaders, participants, and delegators.
            </p>
            <RulesForm communityId={community.id} rules={community.rules} />
          </div>
          <div>
            <h3 className="mb-1 text-xs font-medium">Add funds</h3>
            <p className="mb-2 text-[11px] text-muted-foreground">
              {community.level === "city" || community.level === "local"
                ? "Top up from local sources: advertising revenue, business token purchases, or direct contributions."
                : "Direct contributions from impact allocations, grants, or ad revenue."}
            </p>
            <InflowForm communityId={community.id} />
          </div>
          <div>
            <h3 className="mb-1 text-xs font-medium">Distribute to members</h3>
            <p className="mb-2 text-[11px] text-muted-foreground">
              Pay out funds to leaders, participants, and delegators based on the split above.
            </p>
            <DistributeForm
              communityId={community.id}
              balance={bal}
            />
          </div>
          {hasChildren && (
            <div>
              <h3 className="mb-1 text-xs font-medium">Cascade down</h3>
              <p className="mb-2 text-[11px] text-muted-foreground">
                Push funds to sub-regions based on the allocation percentages above.
              </p>
              <CascadeForm
                communityId={community.id}
                balance={bal}
                childCount={community.children.length}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const sortedChildren = community.children
    .sort(
      (a, b) =>
        LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level) ||
        a.name.localeCompare(b.name)
    );

  return (
    <div className={depth > 0 ? "ml-4 border-l border-border pl-4" : ""}>
      <CollapsibleNode
        label={community.name}
        level={LEVEL_LABELS[community.level] ?? community.level}
        balance={bal}
        proposalCount={totalProposals}
        requestedFunds={totalRequested}
        childCount={community.children.length}
        defaultOpen={depth === 0}
        content={nodeContent}
      >
        {sortedChildren.map((child) => (
          <CommunityNode key={child.id} community={child} depth={depth + 1} />
        ))}
      </CollapsibleNode>
    </div>
  );
}

export default async function TreasuryPage() {
  const admin = createServiceClient();
  const { communityIds: subjectCommunityIds, isPlatformAdmin, activeSubject } = await getSubjectCommunityIds();
  const pool = await getPlatformPool();

  let communityQuery = admin
    .from("communities")
    .select("id, name, slug, level, parent_id, governance_split_pct, max_governance_cap_pct, subject")
    .order("name");

  if (!isPlatformAdmin) {
    communityQuery = communityQuery.eq("subject", activeSubject);
  }

  const { data: communities } = await communityQuery;

  const communityList = communities ?? [];
  const communityIds = communityList.map((c) => c.id);

  // Fetch proposal counts and requested funds per community
  const { data: proposalStats } = communityIds.length > 0
    ? await admin
        .from("proposals")
        .select("community_id, budget_request_cents")
        .in("community_id", communityIds)
    : { data: [] };

  const proposalCountMap = new Map<string, number>();
  const requestedFundsMap = new Map<string, number>();
  for (const p of proposalStats ?? []) {
    proposalCountMap.set(p.community_id, (proposalCountMap.get(p.community_id) ?? 0) + 1);
    requestedFundsMap.set(
      p.community_id,
      (requestedFundsMap.get(p.community_id) ?? 0) + (p.budget_request_cents ?? 0) / 100
    );
  }

  const enriched: EnrichedCommunity[] = await Promise.all(
    communityList.map(async (c) => {
      const rules = await getDistributionRules(c.id);
      const balance = await getTreasuryBalance(c.id);
      const allocations = await getRegionalAllocations(c.id);
      return {
        ...c,
        governanceSplit: Number(c.governance_split_pct ?? 50),
        maxGovernanceCap: Number(c.max_governance_cap_pct ?? 5),
        rules,
        balance,
        allocations,
        proposalCount: proposalCountMap.get(c.id) ?? 0,
        requestedFunds: requestedFundsMap.get(c.id) ?? 0,
        children: [],
      };
    })
  );

  const tree = buildTree(enriched);

  const totalBalance = enriched.reduce(
    (sum, c) => sum + Number(c.balance.balance),
    0
  );
  const totalInflow = enriched.reduce(
    (sum, c) => sum + Number(c.balance.total_inflow),
    0
  );
  const totalDistributed = enriched.reduce(
    (sum, c) => sum + Number(c.balance.total_outflow),
    0
  );

  // Funding requests
  const { data: pendingRequests } = await admin
    .from("funding_requests")
    .select(
      `id, title, description, amount, status, created_at,
      community:communities!funding_requests_community_id_fkey(name, level),
      requester:users!funding_requests_requested_by_fkey(display_name)`
    )
    .eq("status", "pending")
    .in("community_id", communityIds.length > 0 ? communityIds : ["none"])
    .order("created_at", { ascending: false });

  const { data: recentRequests } = await admin
    .from("funding_requests")
    .select(
      `id, title, amount, status, review_note,
      community:communities!funding_requests_community_id_fkey(name, level),
      reviewer:users!funding_requests_reviewed_by_fkey(display_name)`
    )
    .in("status", ["disbursed", "rejected"])
    .in("community_id", communityIds.length > 0 ? communityIds : ["none"])
    .order("created_at", { ascending: false })
    .limit(10);

  const subjectLabel = isPlatformAdmin ? "All subjects" : (SUBJECT_LABELS[activeSubject] ?? activeSubject);

  return (
    <div>
      {/* ── Header ── */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Treasury</h1>
        <div className="mt-3 max-w-3xl space-y-3 text-sm text-muted-foreground">
          <p>
            The treasury funds both the <strong>projects</strong> that
            communities create and the <strong>governance teams</strong> who
            manage them. Treasury funds are split between these two purposes
            at each level, with the ratio controlled by the admin. The
            default starting split is <strong>50% to projects, 50% to
            governance</strong>, meaning the people who build and deliver are
            highly incentivised. As the platform grows, governance overhead
            should not exceed <strong>5% of total project funding</strong>.
          </p>
          <p>
            The governance portion is then divided three ways:{" "}
            <strong>leaders</strong> (leadership group members who hold governance
            seats), <strong>participants</strong> (members who vote on
            proposals and submit ideas), and <strong>delegators</strong>{" "}
            (members who delegate their voting power to others they trust).
            You control the split at each level.
          </p>
          <p>
            Money enters the system from two directions. From the top, the{" "}
            <strong>Platform Steering Committee</strong> holds an unallocated
            pool that any community can apply to draw from. From the bottom,
            local communities can be topped up directly by businesses joining
            the network (who allocate tokens for marketing and governance
            support), advertising revenue, and member contributions.
          </p>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {subjectLabel} balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono">
              {totalBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground">
              LOOP across {enriched.length} communities
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total received
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono text-green-500">
              {totalInflow.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground">LOOP all-time inflows</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Paid to members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono">
              {totalDistributed.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground">LOOP distributed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Steering Committee pool
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono text-amber-500">
              {Number(pool.balance).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground">LOOP unallocated</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Unallocated Funding ── */}
      <section className="mb-10">
        <h2 className="mb-1 text-lg font-semibold tracking-tight">
          Unallocated funding
        </h2>
        <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
          The Platform Steering Committee holds{" "}
          <strong>{Number(pool.balance).toLocaleString()} LOOP</strong> in
          reserve. Community leadership groups can submit proposals to draw
          from this pool for their region or subject area. Approved requests
          are disbursed directly into the requesting community's treasury,
          where they can then be cascaded further down the hierarchy or
          distributed to members.
        </p>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pending requests</CardTitle>
            </CardHeader>
            <CardContent>
              {!pendingRequests || pendingRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No pending funding requests for {subjectLabel} communities.
                </p>
              ) : (
                <div className="space-y-4">
                  {(pendingRequests as any[]).map((r) => (
                    <div key={r.id} className="rounded-lg border p-4">
                      <div className="mb-2 flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium">{r.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {r.community?.name} ({LEVEL_LABELS[r.community?.level] ?? r.community?.level})
                            {" "}by {r.requester?.display_name}
                          </p>
                        </div>
                        <Badge variant="outline" className="font-mono">
                          {Number(r.amount).toLocaleString()} LOOP
                        </Badge>
                      </div>
                      <p className="mb-3 text-xs text-muted-foreground">
                        {r.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <ApproveButton requestId={r.id} />
                        <RejectButton requestId={r.id} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Request funding</CardTitle>
              <p className="text-xs text-muted-foreground">
                Submit a proposal to the Steering Committee. Explain
                what the funds will be used for and the expected impact on
                your region.
              </p>
            </CardHeader>
            <CardContent>
              <FundingRequestForm communities={communityList} />
            </CardContent>
          </Card>
        </div>

        {recentRequests && recentRequests.length > 0 && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Recent decisions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-4">Request</th>
                      <th className="pb-2 pr-4">Community</th>
                      <th className="pb-2 pr-4">Amount</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2">Reviewed by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(recentRequests as any[]).map((r) => (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="py-2.5 pr-4">{r.title}</td>
                        <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                          {r.community?.name}
                        </td>
                        <td className="py-2.5 pr-4 font-mono text-xs">
                          {Number(r.amount).toLocaleString()}
                        </td>
                        <td className="py-2.5 pr-4">
                          <Badge
                            variant={r.status === "disbursed" ? "default" : "destructive"}
                          >
                            {r.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 text-xs text-muted-foreground">
                          {r.reviewer?.display_name ?? "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* ── Cascading Hierarchy ── */}
      <section>
        <h2 className="mb-1 text-lg font-semibold tracking-tight">
          {subjectLabel} treasury hierarchy
        </h2>
        <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
          Funds flow from top to bottom. Each community's leadership group
          controls the regional allocation percentages that determine how much
          cascades to sub-regions and how much is retained for local
          distribution. Local and city-level treasuries can also receive
          direct top-ups from businesses purchasing governance tokens for
          marketing support and advertising revenue.
        </p>

        {tree.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No communities in this subject yet.
            </CardContent>
          </Card>
        ) : (
          tree
            .sort(
              (a, b) =>
                LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level) ||
                a.name.localeCompare(b.name)
            )
            .map((root) => (
              <CommunityNode key={root.id} community={root} depth={0} />
            ))
        )}
      </section>
    </div>
  );
}
