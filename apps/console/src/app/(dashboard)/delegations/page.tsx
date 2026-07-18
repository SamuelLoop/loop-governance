import { createClient, createServiceClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { DelegateForm } from "./delegate-form";
import { RevokeButton } from "./revoke-button";

export default async function DelegationsPage() {
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

  if (!profile) redirect("/login");

  const { data: memberships } = await admin
    .from("community_memberships")
    .select("community_id, communities(id, name, subject_tags)")
    .eq("user_id", profile.id);

  const communities =
    memberships
      ?.map((m: any) => m.communities)
      .filter(Boolean) ?? [];

  const { data: members } = await admin
    .from("users")
    .select("id, display_name")
    .neq("id", profile.id);

  // Delegations I've given
  const { data: givenDelegations } = await admin
    .from("delegations")
    .select(
      "id, subject_tag, created_at, communities(name), delegate:users!delegations_delegate_id_fkey(display_name)"
    )
    .eq("delegator_id", profile.id)
    .eq("active", true)
    .order("created_at", { ascending: false });

  // Delegations I've received
  const { data: receivedDelegations } = await admin
    .from("delegations")
    .select(
      "id, subject_tag, created_at, communities(name), delegator:users!delegations_delegator_id_fkey(display_name)"
    )
    .eq("delegate_id", profile.id)
    .eq("active", true)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-4xl">
      <h1 className="mb-1 text-2xl font-light tracking-tight">Delegations</h1>
      <p className="mb-8 text-sm text-neutral-500">
        Delegate your vote on a subject to someone you trust. They vote on your
        behalf until you revoke. Delegations are transitive: if you delegate to
        Alice and Alice delegates to Bob, Bob votes with the combined weight.
      </p>

      <div className="mb-10 rounded-md border border-neutral-800 bg-neutral-900/50 p-5">
        <p className="mb-4 font-mono text-xs uppercase tracking-wider text-neutral-500">
          Delegate your vote
        </p>
        <DelegateForm
          giverId={profile.id}
          members={members ?? []}
          communities={communities}
        />
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div>
          <p className="mb-4 font-mono text-xs uppercase tracking-wider text-neutral-500">
            Votes you've delegated ({givenDelegations?.length ?? 0})
          </p>
          {givenDelegations && givenDelegations.length > 0 ? (
            <div className="space-y-2">
              {givenDelegations.map((d: any) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-900/30 px-4 py-3"
                >
                  <div>
                    <p className="text-sm text-neutral-200">
                      <span className="text-amber-400">
                        {d.subject_tag}
                      </span>{" "}
                      in {d.communities?.name}
                    </p>
                    <p className="text-xs text-neutral-500">
                      delegated to{" "}
                      <span className="text-neutral-300">
                        {d.delegate?.display_name}
                      </span>{" "}
                      on {new Date(d.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <RevokeButton delegationId={d.id} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-600">
              You haven't delegated any votes yet.
            </p>
          )}
        </div>

        <div>
          <p className="mb-4 font-mono text-xs uppercase tracking-wider text-neutral-500">
            Votes delegated to you ({receivedDelegations?.length ?? 0})
          </p>
          {receivedDelegations && receivedDelegations.length > 0 ? (
            <div className="space-y-2">
              {receivedDelegations.map((d: any) => (
                <div
                  key={d.id}
                  className="rounded-md border border-neutral-800 bg-neutral-900/30 px-4 py-3"
                >
                  <p className="text-sm text-neutral-200">
                    <span className="text-amber-400">{d.subject_tag}</span> in{" "}
                    {d.communities?.name}
                  </p>
                  <p className="text-xs text-neutral-500">
                    from{" "}
                    <span className="text-neutral-300">
                      {d.delegator?.display_name}
                    </span>{" "}
                    since {new Date(d.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-600">
              No one has delegated their vote to you yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
