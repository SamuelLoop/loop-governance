import { createClient, createServiceClient } from "@/lib/supabase-server";
import { getActiveSubject } from "@/lib/subject";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  const activeSubject = await getActiveSubject();

  const { data: memberships } = await admin
    .from("community_memberships")
    .select("community_id, communities(id, name, subject_tags, subject)")
    .eq("user_id", profile.id);

  const communities =
    memberships
      ?.map((m: any) => m.communities)
      .filter((c: any) => c && c.subject === activeSubject) ?? [];

  const { data: members } = await admin
    .from("users")
    .select("id, display_name")
    .neq("id", profile.id);

  const { data: givenDelegations } = await admin
    .from("delegations")
    .select(
      "id, subject_tag, created_at, communities(name), delegate:users!delegations_delegate_id_fkey(display_name)"
    )
    .eq("delegator_id", profile.id)
    .eq("subject_tag", activeSubject)
    .eq("active", true)
    .order("created_at", { ascending: false });

  const { data: receivedDelegations } = await admin
    .from("delegations")
    .select(
      "id, subject_tag, created_at, communities(name), delegator:users!delegations_delegator_id_fkey(display_name)"
    )
    .eq("delegate_id", profile.id)
    .eq("subject_tag", activeSubject)
    .eq("active", true)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-4xl">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        Delegations
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Delegate your vote on a subject to someone you trust. They vote on your
        behalf until you revoke. Delegations are transitive: if you delegate to
        Alice and Alice delegates to Bob, Bob votes with the combined weight.
      </p>

      <Card className="mb-10">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Delegate your vote
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DelegateForm
            giverId={profile.id}
            members={members ?? []}
            communities={communities}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-8">
        <div>
          <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Votes you've delegated ({givenDelegations?.length ?? 0})
          </p>
          {givenDelegations && givenDelegations.length > 0 ? (
            <div className="space-y-2">
              {givenDelegations.map((d: any) => (
                <Card key={d.id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm">
                        <Badge variant="default" className="mr-1.5">
                          {d.subject_tag}
                        </Badge>
                        in {d.communities?.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        delegated to{" "}
                        <span className="text-foreground">
                          {d.delegate?.display_name}
                        </span>{" "}
                        on {new Date(d.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <RevokeButton delegationId={d.id} />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              You haven't delegated any votes yet.
            </p>
          )}
        </div>

        <div>
          <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Votes delegated to you ({receivedDelegations?.length ?? 0})
          </p>
          {receivedDelegations && receivedDelegations.length > 0 ? (
            <div className="space-y-2">
              {receivedDelegations.map((d: any) => (
                <Card key={d.id}>
                  <CardContent className="py-3">
                    <p className="text-sm">
                      <Badge variant="default" className="mr-1.5">
                        {d.subject_tag}
                      </Badge>
                      in {d.communities?.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      from{" "}
                      <span className="text-foreground">
                        {d.delegator?.display_name}
                      </span>{" "}
                      since {new Date(d.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No one has delegated their vote to you yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
