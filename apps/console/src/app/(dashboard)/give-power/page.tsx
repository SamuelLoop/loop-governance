import { createClient, createServiceClient } from "@/lib/supabase-server";
import { getActiveSubject } from "@/lib/subject";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DelegateForm } from "../delegations/delegate-form";
import { RevokeButton } from "../delegations/revoke-button";
import { AccreditForm } from "../accreditation/accredit-form";
import { GivePowerDrawer, DelegationTable, type DelegationRow } from "@loop/ui";

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

  const { data: accreditableMembers } = await admin
    .from("users")
    .select("id, display_name")
    .neq("id", profile.id)
    .order("display_name");

  const givenRows: DelegationRow[] = (givenDelegations ?? []).map((d: any) => ({
    id: d.id,
    subjectTag: d.subject_tag,
    communityName: d.communities?.name ?? "Unknown",
    counterpartyName: d.delegate?.display_name ?? "Unknown",
    createdAt: d.created_at,
  }));

  const receivedRows: DelegationRow[] = (receivedDelegations ?? []).map((d: any) => ({
    id: d.id,
    subjectTag: d.subject_tag,
    communityName: d.communities?.name ?? "Unknown",
    counterpartyName: d.delegator?.display_name ?? "Unknown",
    createdAt: d.created_at,
  }));

  return (
    <div className="max-w-4xl">
      <h1 className="mb-1 text-h1 font-bold tracking-tight text-text-primary">
        Give Power
      </h1>
      <div className="mb-8 space-y-3 text-body text-text-secondary">
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
          interests or the wider community&apos;s interests, you can revoke it
          immediately. You can then either vote directly yourself or give your
          power to someone else who you believe will act with integrity.
        </p>
      </div>

      <div className="mb-10 flex flex-wrap gap-3">
        <GivePowerDrawer
          trigger={<Button>Delegate your vote</Button>}
          title="Delegate your vote"
          description="Choose someone you trust in this subject. They will vote on your behalf until you revoke. Delegations are transitive: if you delegate to Alice and Alice delegates to Bob, Bob votes with the combined weight."
        >
          {myCommunityIdsInSubject.size === 0 ? (
            <p className="text-body text-text-secondary">
              You are not a member of any communities in{" "}
              <span className="font-medium text-text-primary">{activeSubject}</span>{" "}
              yet. Join a community first, then come back to delegate your vote.
            </p>
          ) : members.length === 0 ? (
            <p className="text-body text-text-secondary">
              You are currently the only member of your{" "}
              <span className="font-medium text-text-primary">{activeSubject}</span>{" "}
              communities. Once others join, they will appear here.
            </p>
          ) : (
            <DelegateForm
              giverId={profile.id}
              members={members}
              activeSubject={activeSubject}
            />
          )}
        </GivePowerDrawer>

        <GivePowerDrawer
          trigger={<Button variant="outline">Accredit a peer</Button>}
          title="Accredit a peer"
          description="Recognise someone's competence in this subject. Accreditation builds their reputation and signals to others that they are worth delegating to."
        >
          <AccreditForm
            giverId={profile.id}
            members={accreditableMembers ?? []}
            activeSubject={activeSubject}
          />
        </GivePowerDrawer>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <p className="mb-4 text-caption font-medium uppercase tracking-wider text-text-secondary">
            Power you have given ({givenRows.length})
          </p>
          <DelegationTable
            rows={givenRows}
            counterpartyLabel="to"
            emptyMessage="You haven't delegated any votes yet."
            renderAction={(row) => <RevokeButton delegationId={row.id} />}
          />
        </div>

        <div>
          <p className="mb-4 text-caption font-medium uppercase tracking-wider text-text-secondary">
            Power given to you ({receivedRows.length})
          </p>
          <DelegationTable
            rows={receivedRows}
            counterpartyLabel="from"
            emptyMessage="No one has given you their power yet."
          />
        </div>
      </div>
    </div>
  );
}
