import { createServiceClient } from "@/lib/supabase-server";
import { getSubjectCommunityIds } from "@/lib/subject";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Glass, StatusChip, VoteTally, type StatusChipVariant } from "@loop/ui";

const STATUS_VARIANT: Record<string, StatusChipVariant> = {
  open: "warning",
  approved: "success",
  rejected: "error",
};

// Proposal-type/feature tags are categories, not severity — StatusChip
// stays neutral for all of them (identity carried by the label text),
// same discipline as admin's audit-category chips (session 09). The one
// exception is "Disbursed": that's a genuine completion/success state,
// not just a category, so it gets `success`.

export default async function ProposalsPage() {
  const admin = createServiceClient();
  const { communityIds, isPlatformAdmin } = await getSubjectCommunityIds();

  const { data: proposals } = await admin
    .from("proposals")
    .select(
      `id, title, description, status, budget_request_cents, direct_democracy,
      proposal_type, cascade_allocations, distribution_amount,
      disbursed_at, disbursed_amount,
      votes_for, votes_against, opens_at, closes_at, created_at,
      users!proposals_author_id_fkey(display_name),
      communities!proposals_community_id_fkey(name, slug, subject)`
    )
    .in("community_id", communityIds.length > 0 ? communityIds : ["none"])
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-h1 font-bold tracking-tight text-text-primary">Proposals</h1>
        <Button render={<Link href="/proposals/new" />}>
          New proposal
        </Button>
      </div>

      {proposals && proposals.length > 0 ? (
        <div className="space-y-3">
          {proposals.map((p: any) => (
            <Link key={p.id} href={`/proposals/${p.id}`}>
              <Glass className="p-4 transition-colors hover:border-primary/30">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <StatusChip variant={STATUS_VARIANT[p.status] ?? "neutral"}>
                        {p.status}
                      </StatusChip>
                      <span className="text-caption text-text-secondary">
                        {p.communities?.name}
                      </span>
                      {isPlatformAdmin && p.communities?.subject && (
                        <StatusChip variant="neutral">{p.communities.subject}</StatusChip>
                      )}
                      {p.direct_democracy && (
                        <StatusChip variant="neutral">Direct democracy</StatusChip>
                      )}
                      {p.budget_request_cents != null && p.budget_request_cents > 0 && p.proposal_type === "standard" && (
                        <StatusChip variant="neutral">Budget allocation</StatusChip>
                      )}
                      {p.proposal_type === "regional_cascade" && (
                        <StatusChip variant="neutral">Regional cascade</StatusChip>
                      )}
                      {p.proposal_type === "treasury_distribution" && (
                        <StatusChip variant="neutral">Treasury distribution</StatusChip>
                      )}
                      {p.disbursed_at && (
                        <StatusChip variant="success">Disbursed</StatusChip>
                      )}
                    </div>
                    <h3 className="text-body font-medium text-text-primary">{p.title}</h3>
                    <p className="mt-1 line-clamp-2 text-caption text-text-secondary">
                      {p.description}
                    </p>
                    <p className="mt-2 text-caption text-text-secondary">
                      by {p.users?.display_name ?? "Unknown"} on{" "}
                      {new Date(p.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="ml-4 flex flex-col items-end gap-1">
                    <VoteTally votesFor={p.votes_for} votesAgainst={p.votes_against} />
                    {p.budget_request_cents != null && (
                      <span className="text-caption text-text-secondary">
                        ${(p.budget_request_cents / 100).toFixed(2)} requested
                      </span>
                    )}
                  </div>
                </div>
              </Glass>
            </Link>
          ))}
        </div>
      ) : (
        <Glass className="py-10 text-center">
          <p className="text-body text-text-secondary">No proposals yet.</p>
          <Button variant="link" className="mt-2" render={<Link href="/proposals/new" />}>
            Create the first one
          </Button>
        </Glass>
      )}
    </div>
  );
}
