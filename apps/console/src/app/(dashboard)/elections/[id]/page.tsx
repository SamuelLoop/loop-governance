import { createClient, createServiceClient } from "@/lib/supabase-server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { NominateForm } from "./nominate-form";
import { VoteButton } from "./vote-button";
import { ChevronLeft } from "lucide-react";

export default async function ElectionDetailPage({
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

  const { data: profile } = await admin
    .from("users")
    .select("id, display_name")
    .eq("auth_id", user.id)
    .single();

  const { data: election } = await admin
    .from("elections")
    .select(
      `id, title, description, status, seats, term_days,
      nominations_open, nominations_close, voting_open, voting_close,
      community_id,
      communities!elections_community_id_fkey(name, slug)`
    )
    .eq("id", id)
    .single();

  if (!election) notFound();

  const { data: candidates } = await admin
    .from("candidates")
    .select(
      `id, statement, votes_received, elected, nominated_at,
      users!candidates_user_id_fkey(id, display_name, email)`
    )
    .eq("election_id", id)
    .order("votes_received", { ascending: false });

  const isMember = profile
    ? await admin
        .from("community_memberships")
        .select("id")
        .eq("user_id", profile.id)
        .eq("community_id", election.community_id)
        .single()
        .then((r) => !!r.data)
    : false;

  const myVotes = profile
    ? await admin
        .from("election_votes")
        .select("candidate_id")
        .eq("election_id", id)
        .eq("voter_id", profile.id)
        .then((r) => new Set((r.data ?? []).map((v: any) => v.candidate_id)))
    : new Set<string>();

  const isNominated = profile
    ? (candidates ?? []).some((c: any) => c.users?.id === profile.id)
    : false;

  const now = new Date();
  const maxVotes = Math.max(
    1,
    ...((candidates ?? []).map((c: any) => c.votes_received) as number[])
  );

  return (
    <div>
      <div className="mb-6">
        <Button variant="ghost" size="sm" render={<Link href="/elections" />}>
          <ChevronLeft className="mr-1 h-3 w-3" />
          Elections
        </Button>
      </div>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge
              variant={
                election.status === "nominations"
                  ? "default"
                  : election.status === "voting"
                    ? "secondary"
                    : "outline"
              }
            >
              {election.status}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {(election as any).communities?.name}
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {election.title}
          </h1>
          {election.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {election.description}
            </p>
          )}
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>{election.seats} seats</p>
          <p>{election.term_days} day term</p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-4 gap-4">
        {[
          {
            label: "Nominations open",
            date: election.nominations_open,
          },
          {
            label: "Nominations close",
            date: election.nominations_close,
          },
          { label: "Voting opens", date: election.voting_open },
          { label: "Voting closes", date: election.voting_close },
        ].map((phase) => {
          const d = new Date(phase.date);
          const past = d <= now;
          return (
            <Card key={phase.label}>
              <CardContent className="py-3">
                <p className="text-xs text-muted-foreground">{phase.label}</p>
                <p
                  className={`text-sm font-medium ${past ? "text-muted-foreground" : ""}`}
                >
                  {d.toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {election.status === "nominations" && isMember && !isNominated && (
        <Card className="mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Stand for election
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NominateForm electionId={id} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Candidates ({(candidates ?? []).length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {candidates && candidates.length > 0 ? (
            <div className="space-y-3">
              {candidates.map((c: any) => (
                <div
                  key={c.id}
                  className={`rounded-lg border p-3 ${c.elected ? "border-primary/40 bg-primary/5" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {c.users?.display_name ?? c.users?.email ?? "Unknown"}
                        </span>
                        {c.elected && (
                          <Badge variant="default" className="text-[10px]">
                            Elected
                          </Badge>
                        )}
                      </div>
                      {c.statement && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {c.statement}
                        </p>
                      )}
                      {(election.status === "voting" ||
                        election.status === "completed") && (
                        <div className="mt-2 flex items-center gap-2">
                          <Progress
                            value={
                              maxVotes > 0
                                ? (c.votes_received / maxVotes) * 100
                                : 0
                            }
                            className="h-1.5 flex-1"
                          />
                          <span className="text-xs font-mono text-muted-foreground">
                            {c.votes_received}
                          </span>
                        </div>
                      )}
                    </div>
                    {election.status === "voting" &&
                      isMember &&
                      !myVotes.has(c.id) && (
                        <VoteButton electionId={id} candidateId={c.id} />
                      )}
                    {myVotes.has(c.id) && (
                      <Badge variant="outline" className="text-[10px]">
                        Voted
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No candidates yet. Be the first to stand.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
