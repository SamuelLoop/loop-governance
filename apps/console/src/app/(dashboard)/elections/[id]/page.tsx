import { createClient, createServiceClient } from "@/lib/supabase-server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NominateForm } from "./nominate-form";
import { VoteButton } from "./vote-button";
import { ChevronLeft } from "lucide-react";
import { Glass, StatusChip, type StatusChipVariant } from "@loop/ui";

const STATUS_VARIANT: Record<string, StatusChipVariant> = {
  nominations: "warning",
  voting: "warning",
  completed: "success",
  cancelled: "error",
};

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
            <StatusChip variant={STATUS_VARIANT[election.status] ?? "neutral"}>
              {election.status}
            </StatusChip>
            <span className="text-caption text-text-secondary">
              {(election as any).communities?.name}
            </span>
          </div>
          <h1 className="text-h1 font-bold tracking-tight text-text-primary">
            {election.title}
          </h1>
          {election.description && (
            <p className="mt-1 text-body text-text-secondary">
              {election.description}
            </p>
          )}
        </div>
        <div className="text-right text-caption text-text-secondary">
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
          // A compact date label, not a hero numeral — plain Glass rather
          // than StatTile, whose fixed Data-lg type spec is for stat
          // numerals specifically (see DESIGN.web.md's type scale table).
          return (
            <Glass key={phase.label} className="p-3">
              <p className="text-caption text-text-secondary">{phase.label}</p>
              <p
                className={`text-body font-medium ${past ? "text-text-secondary" : "text-text-primary"}`}
              >
                {d.toLocaleDateString()}
              </p>
            </Glass>
          );
        })}
      </div>

      {election.status === "nominations" && isMember && !isNominated && (
        <Glass className="mb-8 p-5">
          <h2 className="mb-3 text-caption font-medium uppercase tracking-wider text-text-secondary">
            Stand for election
          </h2>
          <NominateForm electionId={id} />
        </Glass>
      )}

      <Glass className="p-5">
        <h2 className="mb-3 text-caption font-medium uppercase tracking-wider text-text-secondary">
          Candidates ({(candidates ?? []).length})
        </h2>
        {candidates && candidates.length > 0 ? (
          <div className="space-y-3">
            {candidates.map((c: any) => (
              <div
                key={c.id}
                className={`rounded-panel border p-3 ${c.elected ? "border-success/40 bg-success/5" : "border-surface-border"}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-body font-medium text-text-primary">
                        {c.users?.display_name ?? c.users?.email ?? "Unknown"}
                      </span>
                      {c.elected && <StatusChip variant="success">Elected</StatusChip>}
                    </div>
                    {c.statement && (
                      <p className="mt-1 text-caption text-text-secondary">
                        {c.statement}
                      </p>
                    )}
                    {(election.status === "voting" ||
                      election.status === "completed") && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
                          <div
                            className="h-full rounded-full bg-primary transition-[width] duration-[var(--duration-vote-bar)] ease-[var(--ease-vote-bar)]"
                            style={{
                              width: `${maxVotes > 0 ? (c.votes_received / maxVotes) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <span className="font-mono text-caption text-text-secondary">
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
                  {myVotes.has(c.id) && <StatusChip variant="neutral">Voted</StatusChip>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-body text-text-secondary">
            No candidates yet. Be the first to stand.
          </p>
        )}
      </Glass>
    </div>
  );
}
