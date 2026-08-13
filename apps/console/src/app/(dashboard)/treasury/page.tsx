import { createServiceClient } from "@/lib/supabase-server";
import { getSubjectCommunityIds } from "@/lib/subject";
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
import {
  Glass,
  StatTile,
  StatusChip,
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
  type StatusChipVariant,
} from "@loop/ui";

// Funding-request status: disbursed/rejected is a clean 2-value semantic
// fit (DESIGN.web.md StatusChip — semantic colour only), same mapping
// admin's moderation flag status used (session 09).
const REQUEST_STATUS_VARIANT: Record<string, StatusChipVariant> = {
  disbursed: "success",
  rejected: "error",
};

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
    <Glass className="mb-4 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-caption text-text-secondary">
          {community.balance.inflow_count} inflows / {community.balance.outflow_count} outflows
        </p>
      </div>

      {/* Regional allocation bar — a composition of same-identity children
          (each is "a sub-community's share"), so per DESIGN.web.md's
          data-viz rule this stays single-hue (brand accent) rather than
          one colour per child; "Retained" is the one distinct bucket and
          gets neutral grey, not a second saturated hue. Read dataviz
          skill before this edit (session web-10-console-rollout.md). */}
      {hasChildren && community.allocations.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-body font-medium text-text-secondary">
            Regional allocation to sub-communities
          </p>
          <div className="mb-2 flex h-3 overflow-hidden rounded-full bg-surface gap-0.5">
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
                className="bg-text-secondary/25"
                style={{ width: `${100 - allocationTotal}%` }}
                title={`Retained: ${(100 - allocationTotal).toFixed(1)}%`}
              />
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-text-secondary">
            {community.allocations.map((a) => (
              <span key={a.child.id}>
                {a.child.name}: {a.allocation_pct}%
              </span>
            ))}
            {allocationTotal < 100 && (
              <span className="text-text-secondary">
                Retained: {(100 - allocationTotal).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      )}

      {/* Project vs Governance split — two-series comparison, so per
          DESIGN.web.md: brand accent for the primary series (Governance,
          the cascading/controlled share), text-secondary grey for the
          comparison series (Projects) — not a second saturated hue. */}
      <Glass className="mb-4 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-body font-medium text-text-primary">Funding split</p>
          <p className="text-caption text-text-secondary">
            Max governance cap: {community.maxGovernanceCap}%
          </p>
        </div>
        <div className="mb-1 flex h-3 overflow-hidden rounded-full bg-surface">
          <div
            className="bg-text-secondary/40 rounded-l-full"
            style={{ width: `${100 - community.governanceSplit}%` }}
            title={`Projects: ${100 - community.governanceSplit}%`}
          />
          <div
            className="bg-primary/70 rounded-r-full"
            style={{ width: `${community.governanceSplit}%` }}
            title={`Governance: ${community.governanceSplit}%`}
          />
        </div>
        <div className="flex justify-between text-caption text-text-secondary">
          <span>Projects: {100 - community.governanceSplit}%</span>
          <span className="text-primary">
            Governance: {community.governanceSplit}%
          </span>
        </div>
      </Glass>

      <div className={`grid gap-6 ${hasChildren ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
        <div>
          <h3 className="mb-1 text-body font-medium text-text-primary">Governance split</h3>
          <p className="mb-2 text-caption text-text-secondary">
            How the governance portion ({community.governanceSplit}%) is
            divided between leaders, participants, and delegators.
          </p>
          <RulesForm communityId={community.id} rules={community.rules} />
        </div>
        <div>
          <h3 className="mb-1 text-body font-medium text-text-primary">Add funds</h3>
          <p className="mb-2 text-caption text-text-secondary">
            {community.level === "city" || community.level === "local"
              ? "Top up from local sources: advertising revenue, business token purchases, or direct contributions."
              : "Direct contributions from impact allocations, grants, or ad revenue."}
          </p>
          <InflowForm communityId={community.id} />
        </div>
        <div>
          <h3 className="mb-1 text-body font-medium text-text-primary">Distribute to members</h3>
          <p className="mb-2 text-caption text-text-secondary">
            Pay out funds to leaders, participants, and delegators based on the split above.
          </p>
          <DistributeForm
            communityId={community.id}
            balance={bal}
          />
        </div>
        {hasChildren && (
          <div>
            <h3 className="mb-1 text-body font-medium text-text-primary">Cascade down</h3>
            <p className="mb-2 text-caption text-text-secondary">
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
    </Glass>
  );

  const sortedChildren = community.children
    .sort(
      (a, b) =>
        LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level) ||
        a.name.localeCompare(b.name)
    );

  return (
    <div className={depth > 0 ? "ml-4 border-l border-surface-border pl-4" : ""}>
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
        <h1 className="text-h1 font-bold tracking-tight text-text-primary">Treasury</h1>
        <div className="mt-3 max-w-3xl space-y-3 text-body text-text-secondary">
          <p>
            The treasury funds both the <strong className="text-text-primary">projects</strong> that
            communities create and the <strong className="text-text-primary">governance teams</strong> who
            manage them. Treasury funds are split between these two purposes
            at each level, with the ratio controlled by the admin. The
            default starting split is <strong className="text-text-primary">50% to projects, 50% to
            governance</strong>, meaning the people who build and deliver are
            highly incentivised. As the platform grows, governance overhead
            should not exceed <strong className="text-text-primary">5% of total project funding</strong>.
          </p>
          <p>
            The governance portion is then divided three ways:{" "}
            <strong className="text-text-primary">leaders</strong> (leadership group members who hold governance
            seats), <strong className="text-text-primary">participants</strong> (members who vote on
            proposals and submit ideas), and <strong className="text-text-primary">delegators</strong>{" "}
            (members who delegate their voting power to others they trust).
            You control the split at each level.
          </p>
          <p>
            Money enters the system from two directions. From the top, the{" "}
            <strong className="text-text-primary">Platform Steering Committee</strong> holds an unallocated
            pool that any community can apply to draw from. From the bottom,
            local communities can be topped up directly by businesses joining
            the network (who allocate tokens for marketing and governance
            support), advertising revenue, and member contributions.
          </p>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        <StatTile
          label={`${subjectLabel} balance`}
          value={totalBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        />
        <StatTile
          label="Total received"
          value={totalInflow.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          valueClassName="text-success"
        />
        <StatTile
          label="Paid to members"
          value={totalDistributed.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        />
        <StatTile
          label="Steering Committee pool"
          value={Number(pool.balance).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          valueClassName="text-warning"
        />
      </div>

      {/* ── Unallocated Funding ── */}
      <section className="mb-10">
        <h2 className="mb-1 text-h2 font-bold tracking-tight text-text-primary">
          Unallocated funding
        </h2>
        <p className="mb-4 max-w-3xl text-body text-text-secondary">
          The Platform Steering Committee holds{" "}
          <strong className="text-text-primary">{Number(pool.balance).toLocaleString()} LOOP</strong> in
          reserve. Community leadership groups can submit proposals to draw
          from this pool for their region or subject area. Approved requests
          are disbursed directly into the requesting community&apos;s treasury,
          where they can then be cascaded further down the hierarchy or
          distributed to members.
        </p>

        <div className="grid gap-6 lg:grid-cols-2">
          <Glass className="p-5">
            <h3 className="mb-3 text-h2 font-bold text-text-primary">Pending requests</h3>
            {!pendingRequests || pendingRequests.length === 0 ? (
              <p className="text-body text-text-secondary">
                No pending funding requests for {subjectLabel} communities.
              </p>
            ) : (
              <div className="space-y-4">
                {(pendingRequests as any[]).map((r) => (
                  <Glass key={r.id} className="p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <p className="text-body font-medium text-text-primary">{r.title}</p>
                        <p className="mt-0.5 text-caption text-text-secondary">
                          {r.community?.name} ({LEVEL_LABELS[r.community?.level] ?? r.community?.level})
                          {" "}by {r.requester?.display_name}
                        </p>
                      </div>
                      <span className="whitespace-nowrap rounded-pill border border-surface-border px-2 py-0.5 font-mono text-data-sm text-text-secondary">
                        {Number(r.amount).toLocaleString()} LOOP
                      </span>
                    </div>
                    <p className="mb-3 text-caption text-text-secondary">
                      {r.description}
                    </p>
                    <div className="flex items-center gap-2">
                      <ApproveButton requestId={r.id} />
                      <RejectButton requestId={r.id} />
                    </div>
                  </Glass>
                ))}
              </div>
            )}
          </Glass>

          <Glass className="p-5">
            <h3 className="mb-1 text-h2 font-bold text-text-primary">Request funding</h3>
            <p className="mb-3 text-caption text-text-secondary">
              Submit a proposal to the Steering Committee. Explain
              what the funds will be used for and the expected impact on
              your region.
            </p>
            <FundingRequestForm communities={communityList} />
          </Glass>
        </div>

        {recentRequests && recentRequests.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-3 text-h2 font-bold text-text-primary">Recent decisions</h3>
            <DataTable>
              <DataTableHeader>
                <tr>
                  <DataTableHead>Request</DataTableHead>
                  <DataTableHead>Community</DataTableHead>
                  <DataTableHead align="right">Amount</DataTableHead>
                  <DataTableHead>Status</DataTableHead>
                  <DataTableHead>Reviewed by</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {(recentRequests as any[]).map((r) => (
                  <DataTableRow key={r.id}>
                    <DataTableCell>{r.title}</DataTableCell>
                    <DataTableCell className="text-text-secondary">
                      {r.community?.name}
                    </DataTableCell>
                    <DataTableCell numeric align="right">
                      {Number(r.amount).toLocaleString()}
                    </DataTableCell>
                    <DataTableCell>
                      <StatusChip variant={REQUEST_STATUS_VARIANT[r.status] ?? "neutral"}>
                        {r.status}
                      </StatusChip>
                    </DataTableCell>
                    <DataTableCell className="text-text-secondary">
                      {r.reviewer?.display_name ?? "-"}
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          </div>
        )}
      </section>

      {/* ── Cascading Hierarchy ── */}
      <section>
        <h2 className="mb-1 text-h2 font-bold tracking-tight text-text-primary">
          {subjectLabel} treasury hierarchy
        </h2>
        <p className="mb-4 max-w-3xl text-body text-text-secondary">
          Funds flow from top to bottom. Each community&apos;s leadership group
          controls the regional allocation percentages that determine how much
          cascades to sub-regions and how much is retained for local
          distribution. Local and city-level treasuries can also receive
          direct top-ups from businesses purchasing governance tokens for
          marketing support and advertising revenue.
        </p>

        {tree.length === 0 ? (
          <Glass className="py-8 text-center text-body text-text-secondary">
            No communities in this subject yet.
          </Glass>
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
