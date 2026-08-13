import { createClient, createServiceClient } from "@/lib/supabase-server";
import { getSubjectCommunityIds } from "@/lib/subject";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CreateElectionForm } from "./create-form";
import { Glass, StatusChip, type StatusChipVariant } from "@loop/ui";

// nominations/voting are both "active, ongoing" phases (mirrors
// proposals' open=warning convention); completed/cancelled are the two
// terminal states. nominations vs voting stays distinguished by the
// label text, not colour, same discipline used throughout this session.
const STATUS_VARIANT: Record<string, StatusChipVariant> = {
  nominations: "warning",
  voting: "warning",
  completed: "success",
  cancelled: "error",
};

export default async function ElectionsPage() {
  const supabase = await createClient();
  const admin = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await admin
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  const { communityIds, isPlatformAdmin } = await getSubjectCommunityIds();

  const { data: elections } = await admin
    .from("elections")
    .select(
      `id, title, status, seats, term_days,
      nominations_open, nominations_close, voting_open, voting_close, created_at,
      communities!elections_community_id_fkey(name, slug, subject)`
    )
    .in("community_id", communityIds.length > 0 ? communityIds : ["none"])
    .order("created_at", { ascending: false });

  // Get communities where user is admin/quorum for the create form
  const { data: adminCommunities } = profile
    ? await admin
        .from("community_memberships")
        .select("communities!community_memberships_community_id_fkey(id, name)")
        .eq("user_id", profile.id)
        .in("role", ["admin", "quorum"])
    : { data: null };

  const communities =
    adminCommunities?.map((m: any) => m.communities).filter(Boolean) ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 font-bold tracking-tight text-text-primary">Elections</h1>
          <p className="mt-1 text-body text-text-secondary">
            Power shifts through timed leadership rotation
          </p>
        </div>
      </div>

      {communities.length > 0 && (
        <Glass className="mb-8 p-5">
          <h2 className="mb-3 text-caption font-medium uppercase tracking-wider text-text-secondary">
            Call an election
          </h2>
          <CreateElectionForm communities={communities} />
        </Glass>
      )}

      {elections && elections.length > 0 ? (
        <div className="space-y-3">
          {elections.map((e: any) => {
            const phase =
              e.status === "nominations"
                ? `Nominations close ${new Date(e.nominations_close).toLocaleDateString()}`
                : e.status === "voting"
                  ? `Voting closes ${new Date(e.voting_close).toLocaleDateString()}`
                  : e.status === "completed"
                    ? `Completed ${new Date(e.voting_close).toLocaleDateString()}`
                    : "Cancelled";

            return (
              <Link key={e.id} href={`/elections/${e.id}`}>
                <Glass className="p-4 transition-colors hover:border-primary/30">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <StatusChip variant={STATUS_VARIANT[e.status] ?? "neutral"}>
                          {e.status}
                        </StatusChip>
                        <span className="text-caption text-text-secondary">
                          {e.communities?.name}
                        </span>
                        {isPlatformAdmin && e.communities?.subject && (
                          <StatusChip variant="neutral">{e.communities.subject}</StatusChip>
                        )}
                      </div>
                      <h3 className="text-body font-medium text-text-primary">{e.title}</h3>
                      <p className="mt-1 text-caption text-text-secondary">
                        {phase}
                      </p>
                    </div>
                    <div className="text-right text-caption text-text-secondary">
                      <p>{e.seats} seats</p>
                      <p>{e.term_days} day term</p>
                    </div>
                  </div>
                </Glass>
              </Link>
            );
          })}
        </div>
      ) : (
        <Glass className="py-10 text-center text-body text-text-secondary">
          No elections yet. Elections are triggered automatically when leadership group
          terms expire, or can be called manually.
        </Glass>
      )}
    </div>
  );
}
