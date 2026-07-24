import { createServiceClient } from "@/lib/supabase-server";
import { getSubjectCommunityIds } from "@/lib/subject";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function ProposalsPage() {
  const admin = createServiceClient();
  const { communityIds, isPlatformAdmin } = await getSubjectCommunityIds();

  const { data: proposals } = await admin
    .from("proposals")
    .select(
      `id, title, description, status, budget_request_cents, direct_democracy,
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
        <h1 className="text-2xl font-semibold tracking-tight">Proposals</h1>
        <Button render={<Link href="/proposals/new" />}>
          New proposal
        </Button>
      </div>

      {proposals && proposals.length > 0 ? (
        <div className="space-y-3">
          {proposals.map((p: any) => (
            <Link key={p.id} href={`/proposals/${p.id}`}>
              <Card className="transition hover:border-primary/30">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <Badge
                          variant={
                            p.status === "open"
                              ? "default"
                              : p.status === "approved"
                                ? "secondary"
                                : p.status === "rejected"
                                  ? "destructive"
                                  : "outline"
                          }
                        >
                          {p.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {p.communities?.name}
                        </span>
                        {isPlatformAdmin && p.communities?.subject && (
                          <Badge variant="outline" className="text-[10px]">
                            {p.communities.subject}
                          </Badge>
                        )}
                        {p.direct_democracy && (
                          <Badge variant="secondary" className="text-[10px]">
                            Direct democracy
                          </Badge>
                        )}
                        {p.budget_request_cents != null && p.budget_request_cents > 0 && (
                          <Badge
                            className="border-amber-500/40 bg-amber-500/15 text-[10px] text-amber-400"
                            variant="outline"
                          >
                            Budget allocation
                          </Badge>
                        )}
                        {p.disbursed_at && (
                          <Badge
                            className="border-green-500/40 bg-green-500/15 text-[10px] text-green-400"
                            variant="outline"
                          >
                            Disbursed
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-base font-medium">{p.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {p.description}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        by {p.users?.display_name ?? "Unknown"} on{" "}
                        {new Date(p.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="ml-4 flex flex-col items-end gap-1">
                      <div className="flex gap-2 font-mono text-sm">
                        <span className="text-green-500">
                          +{p.votes_for}
                        </span>
                        <span className="text-red-400">
                          -{p.votes_against}
                        </span>
                      </div>
                      {p.budget_request_cents != null && (
                        <span className="text-xs text-muted-foreground">
                          ${(p.budget_request_cents / 100).toFixed(2)} requested
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">No proposals yet.</p>
            <Button variant="link" className="mt-2" render={<Link href="/proposals/new" />}>
              Create the first one
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
