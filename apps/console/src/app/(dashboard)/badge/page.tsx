import { createClient, createServiceClient } from "@/lib/supabase-server";
import { getActiveSubject } from "@/lib/subject";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Share2 } from "lucide-react";
import { generateTreeSVG, type TreeNode, type TreeData } from "@/lib/power-tree";

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

const TIERS: { name: string; min: number; color: string }[] = [
  { name: "Diamond", min: 500, color: "#b9f2ff" },
  { name: "Platinum", min: 200, color: "#e5e4e2" },
  { name: "Gold", min: 80, color: "#f59e0b" },
  { name: "Silver", min: 30, color: "#94a3b8" },
  { name: "Bronze", min: 0, color: "#cd7f32" },
];

function getTier(score: number) {
  for (const t of TIERS) {
    if (score >= t.min) return t;
  }
  return TIERS[TIERS.length - 1];
}

async function fetchConsoleTree(userId: string, subject: string, admin: any): Promise<TreeData> {
  const [l1DelRes, l1AccRes] = await Promise.all([
    admin.from("delegations").select("delegator_id").eq("delegate_id", userId).eq("subject_tag", subject).eq("active", true),
    admin.from("accreditations").select("giver_id").eq("receiver_id", userId).eq("subject_tag", subject).eq("active", true),
  ]);

  const l1DelIds: string[] = (l1DelRes.data ?? []).map((d: any) => d.delegator_id);
  const l1AccIds: string[] = (l1AccRes.data ?? []).map((a: any) => a.giver_id);
  const l1Ids = [...new Set([...l1DelIds, ...l1AccIds])];
  if (l1Ids.length === 0) return { nodes: [], tailCount: 0 };

  const [l2DelRes, l2AccRes] = await Promise.all([
    admin.from("delegations").select("delegator_id, delegate_id").in("delegate_id", l1Ids).eq("subject_tag", subject).eq("active", true),
    admin.from("accreditations").select("giver_id, receiver_id").in("receiver_id", l1Ids).eq("subject_tag", subject).eq("active", true),
  ]);
  const l2DelRows: { delegator_id: string; delegate_id: string }[] = l2DelRes.data ?? [];
  const l2AccRows: { giver_id: string; receiver_id: string }[] = l2AccRes.data ?? [];
  const l2Ids = [...new Set([...l2DelRows.map(r => r.delegator_id), ...l2AccRows.map(r => r.giver_id)])];

  let tailCount = 0;
  const l3Rows: { delegator_id: string; delegate_id: string }[] = [];
  if (l2Ids.length > 0) {
    const { data: l3Data, count } = await admin
      .from("delegations").select("delegator_id, delegate_id", { count: "exact" })
      .in("delegate_id", l2Ids).eq("subject_tag", subject).eq("active", true).limit(30);
    const shown = (l3Data ?? []) as { delegator_id: string; delegate_id: string }[];
    l3Rows.push(...shown);
    tailCount = Math.max(0, (count ?? 0) - shown.length);
  }

  const l3Ids = [...new Set(l3Rows.map(r => r.delegator_id))];
  const allIds = [...new Set([...l1Ids, ...l2Ids, ...l3Ids])];

  const [usersRes, scoresRes] = await Promise.all([
    admin.from("users").select("id, display_name").in("id", allIds),
    admin.from("accreditation_scores").select("user_id, score").in("user_id", allIds).eq("subject_tag", subject).is("community_id", null),
  ]);

  const nameMap = new Map<string, string>((usersRes.data ?? []).map((u: any) => [u.id, u.display_name ?? "—"]));
  const scoreMap = new Map<string, number>((scoresRes.data ?? []).map((s: any) => [s.user_id, Number(s.score)]));
  const gs = (id: string) => Math.min(1, Math.max(0.05, scoreMap.get(id) ?? 0.1));

  const nodes: TreeNode[] = [];
  const seenL1 = new Set<string>();

  for (const row of (l1DelRes.data ?? [])) {
    if (seenL1.has(row.delegator_id)) continue;
    seenL1.add(row.delegator_id);
    nodes.push({ id: row.delegator_id, parentId: userId, name: nameMap.get(row.delegator_id) ?? "—", score: gs(row.delegator_id), edgeType: "delegation", depth: 1 });
  }
  for (const row of (l1AccRes.data ?? [])) {
    if (seenL1.has(row.giver_id)) continue;
    seenL1.add(row.giver_id);
    nodes.push({ id: row.giver_id, parentId: userId, name: nameMap.get(row.giver_id) ?? "—", score: gs(row.giver_id), edgeType: "accreditation", depth: 1 });
  }

  const seenL2 = new Set<string>();
  for (const row of l2DelRows) {
    if (seenL2.has(row.delegator_id) || !seenL1.has(row.delegate_id)) continue;
    seenL2.add(row.delegator_id);
    nodes.push({ id: row.delegator_id, parentId: row.delegate_id, name: nameMap.get(row.delegator_id) ?? "—", score: gs(row.delegator_id), edgeType: "delegation", depth: 2 });
  }
  for (const row of l2AccRows) {
    if (seenL2.has(row.giver_id) || !seenL1.has(row.receiver_id)) continue;
    seenL2.add(row.giver_id);
    nodes.push({ id: row.giver_id, parentId: row.receiver_id, name: nameMap.get(row.giver_id) ?? "—", score: gs(row.giver_id), edgeType: "accreditation", depth: 2 });
  }

  const seenL3 = new Set<string>();
  for (const row of l3Rows) {
    if (seenL3.has(row.delegator_id) || !seenL2.has(row.delegate_id)) continue;
    seenL3.add(row.delegator_id);
    nodes.push({ id: row.delegator_id, parentId: row.delegate_id, name: "", score: gs(row.delegator_id), edgeType: "delegation", depth: 3 });
  }

  return { nodes, tailCount };
}

export default async function BadgePage() {
  const supabase = await createClient();
  const admin = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await admin
    .from("users")
    .select("id, display_name, avatar_url, location_name, subject_expertise")
    .eq("auth_id", user.id)
    .single();

  if (!profile) redirect("/");

  const activeSubject = await getActiveSubject();
  const userId = profile.id;

  const { data: subjectCommunities } = await admin
    .from("communities")
    .select("id")
    .eq("subject", activeSubject);

  const communityIds = (subjectCommunities ?? []).map((c: any) => c.id);

  const [accResult, votesResult, propsResult, scoreResult, tree] = await Promise.all([
    admin.from("accreditations").select("weight").eq("receiver_id", userId).eq("active", true).eq("subject_tag", activeSubject),
    admin.from("votes").select("*", { count: "exact", head: true }).eq("user_id", userId),
    admin.from("proposals").select("*", { count: "exact", head: true }).eq("author_id", userId),
    admin.from("accreditation_scores").select("score, rank").eq("user_id", userId).eq("subject_tag", activeSubject).is("community_id", null).maybeSingle(),
    fetchConsoleTree(userId, activeSubject, admin),
  ]);

  const accreditationWeight = (accResult.data ?? []).reduce((s: number, a: any) => s + (a.weight ?? 1), 0);
  const votesCast = votesResult.count ?? 0;
  const proposalsAuthored = propsResult.count ?? 0;

  let delegationsReceived = 0;
  let communitiesJoined = 0;
  let totalEarnings = 0;

  if (communityIds.length > 0) {
    const [del, mems, earn] = await Promise.all([
      admin.from("delegations").select("*", { count: "exact", head: true }).eq("delegate_id", userId).eq("active", true).in("community_id", communityIds),
      admin.from("community_memberships").select("*", { count: "exact", head: true }).eq("user_id", userId).in("community_id", communityIds),
      admin.from("earnings").select("amount").eq("user_id", userId).in("community_id", communityIds),
    ]);
    delegationsReceived = del.count ?? 0;
    communitiesJoined = mems.count ?? 0;
    totalEarnings = (earn.data ?? []).reduce((s: number, e: any) => s + Number(e.amount), 0);
  }

  const powerScore =
    delegationsReceived * 10 +
    accreditationWeight * 5 +
    votesCast * 2 +
    proposalsAuthored * 8 +
    communitiesJoined * 3 +
    Math.floor(totalEarnings * 0.1);

  const tier = getTier(powerScore);
  const label = SUBJECT_LABELS[activeSubject] ?? activeSubject;
  const badgeUrl = `https://gov.loopcmbntr.live/badge/${userId}/${activeSubject}`;

  const standingScore = scoreResult.data?.score;
  const standingRank = scoreResult.data?.rank;
  const statItems = [
    { label: "Delegations received", value: delegationsReceived },
    { label: "Accreditation weight", value: accreditationWeight.toFixed(2) },
    ...(standingScore != null ? [{ label: standingRank != null ? `Standing (#${standingRank} in ${label})` : `Standing in ${label}`, value: (Number(standingScore) * 100).toFixed(1) }] : []),
    { label: "Votes cast", value: votesCast },
    { label: "Proposals authored", value: proposalsAuthored },
    { label: "Communities joined", value: communitiesJoined },
    { label: "LOOP earned", value: totalEarnings.toLocaleString(undefined, { maximumFractionDigits: 0 }) },
  ];

  const treeNetworkTotal = tree.nodes.length;
  const treeDelegators = tree.nodes.filter(n => n.depth === 1).length;

  const treeSvg = generateTreeSVG({
    tree,
    tierColor: tier.color,
    powerScore,
    tier: tier.name,
    userName: profile.display_name ?? "Unknown",
    subject: label,
    delegators: treeDelegators,
    networkTotal: treeNetworkTotal,
    votes: votesCast,
    proposals: proposalsAuthored,
    communities: communitiesJoined,
    mode: "badge",
  });

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        My Power Badge
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Your governance power in {label}. Share this badge on social media to
        show your commitment and influence.
      </p>

      <Card className="overflow-hidden">
        <div
          className="relative border-b px-6 py-8"
          style={{ background: `radial-gradient(circle at 50% 0%, ${tier.color}08, transparent 70%)` }}
        >
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full text-lg font-bold"
              style={{ backgroundColor: `${tier.color}15`, color: tier.color, border: `2px solid ${tier.color}40` }}
            >
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.display_name ?? ""} className="h-full w-full object-cover" />
              ) : (
                profile.display_name?.[0]?.toUpperCase() ?? "?"
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold">{profile.display_name}</h2>
              <p className="text-xs text-muted-foreground">{label} Governor</p>
            </div>
            <div className="ml-auto text-right">
              <Badge variant="outline" className="mb-1 text-xs font-bold" style={{ color: tier.color, borderColor: `${tier.color}40` }}>
                {tier.name}
              </Badge>
              <p className="text-3xl font-black tabular-nums" style={{ color: tier.color }}>{powerScore}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Power score</p>
            </div>
          </div>

          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, (powerScore / 500) * 100)}%`, backgroundColor: tier.color, boxShadow: `0 0 6px ${tier.color}` }} />
          </div>
          <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
            <span>Bronze</span>
            <span>Silver (30)</span>
            <span>Gold (80)</span>
            <span>Plat (200)</span>
            <span>Diamond (500)</span>
          </div>
        </div>

        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {statItems.map((s) => (
              <div key={s.label} className="rounded-lg border bg-muted/30 p-3 text-center">
                <p className="text-lg font-bold tabular-nums">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <a
              href={badgeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              <Share2 className="h-4 w-4" />
              Share my badge
              <ExternalLink className="h-3 w-3 opacity-50" />
            </a>
          </div>

          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Your badge generates an image preview when shared on X, LinkedIn,
            Facebook, Instagram, and WhatsApp.
          </p>
        </CardContent>
      </Card>

      {/* Power Tree */}
      <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        My Power Tree
      </h2>
      <div
        className="overflow-hidden rounded-2xl"
        style={{ boxShadow: `0 0 60px ${tier.color}30` }}
        dangerouslySetInnerHTML={{ __html: treeSvg.replace("<svg ", '<svg style="width:100%;height:auto" ') }}
      />

      {/* How scoring works */}
      <div className="mt-6 rounded-lg border p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          How power is calculated
        </h3>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>Each delegation received = 10 points</p>
          <p>Each accreditation point = 5 points</p>
          <p>Each proposal authored = 8 points</p>
          <p>Each community joined = 3 points</p>
          <p>Each vote cast = 2 points</p>
          <p>LOOP earned = 0.1 points per token</p>
        </div>
      </div>
    </div>
  );
}
