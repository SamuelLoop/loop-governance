import { createClient, createServiceClient } from "@/lib/supabase-server";
import { getActiveSubject } from "@/lib/subject";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DelegateForm } from "../delegations/delegate-form";
import { RevokeButton } from "../delegations/revoke-button";
import { AccreditForm } from "../accreditation/accredit-form";

export default async function GivePowerPage() {
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

  const { data: myMemberships } = await admin
    .from("community_memberships")
    .select("community_id, communities!inner(subject)")
    .eq("user_id", profile.id);
  const myCommunityIdsInSubject = new Set(
    (myMemberships ?? [])
      .filter((m: any) => m.communities?.subject === activeSubject)
      .map((m: any) => m.community_id)
  );

  let members: { id: string; display_name: string }[] = [];
  if (myCommunityIdsInSubject.size > 0) {
    const { data: peerMemberships } = await admin
      .from("community_memberships")
      .select("user_id, users!inner(id, display_name)")
      .in("community_id", [...myCommunityIdsInSubject])
      .neq("user_id", profile.id);
    const uniq = new Map<string, string>();
    for (const m of peerMemberships ?? []) {
      const u = (m as any).users;
      if (u) uniq.set(u.id, u.display_name);
    }
    members = [...uniq.entries()]
      .map(([id, display_name]) => ({ id, display_name }))
      .sort((a, b) => a.display_name.localeCompare(b.display_name));
  }

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

  const { data: accreditCommunities } = await admin
    .from("communities")
    .select("id, name, subject, level")
    .eq("subject", activeSubject)
    .order("level");

  return (
    <div className="max-w-4xl">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        Give Power
      </h1>
      <div className="mb-8 space-y-3 text-sm text-muted-foreground">
        <p>
          None of us have the time or interest to be experts on every subject,
          but our lives are affected by every subject. That is the problem
          with traditional democracy: you vote on things you do not fully
          understand, or you do not vote at all.
        </p>
        <p>
          We have built a different system. You can delegate your voting power
          to people you believe have the knowledge, wisdom, and genuine
          interest in a subject so they can vote on your behalf. Your voice
          still counts, it is just carried by someone you trust to use it well.
        </p>
        <p>
          This is not permanent and it is not blind. If you ever feel your
          power was used incorrectly, or in a way that goes against your
          interests or the wider community's interests, you can revoke it
          immediately. You can then either vote directly yourself or give your
          power to someone else who you believe will act with integrity.
        </p>
      </div>

      <Card className="mb-10">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Delegate your vote
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Choose someone you trust in this subject. They will vote on your
            behalf until you revoke. Delegations are transitive: if you
            delegate to Alice and Alice delegates to Bob, Bob votes with the
            combined weight.
          </p>
        </CardHeader>
        <CardContent>
          {myCommunityIdsInSubject.size === 0 ? (
            <p className="text-sm text-muted-foreground">
              You are not a member of any communities in{" "}
              <span className="font-medium text-foreground">{activeSubject}</span>{" "}
              yet. Join a community first, then come back to delegate your vote.
            </p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You are currently the only member of your{" "}
              <span className="font-medium text-foreground">{activeSubject}</span>{" "}
              communities. Once others join, they will appear here.
            </p>
          ) : (
            <DelegateForm
              giverId={profile.id}
              members={members}
              activeSubject={activeSubject}
            />
          )}
        </CardContent>
      </Card>

      <Card className="mb-10">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Accredit a peer
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Recognise someone's competence in this subject. Accreditation
            builds their reputation and signals to others that they are
            worth delegating to.
          </p>
        </CardHeader>
        <CardContent>
          <AccreditForm
            giverId={profile.id}
            members={members ?? []}
            communities={accreditCommunities ?? []}
            activeSubject={activeSubject}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-8">
        <div>
          <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Power you have given ({givenDelegations?.length ?? 0})
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
            Power given to you ({receivedDelegations?.length ?? 0})
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
              No one has given you their power yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
