import { createClient, createServiceClient } from "@/lib/supabase-server";
import { getActiveSubject } from "@/lib/subject";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Share2 } from "lucide-react";

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

export default async function BadgePage() {
  const supabase = await createClient();
  const admin = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  const [accResult, votesResult, propsResult] = await Promise.all([
    admin
      .from("accreditations")
      .select("weight")
      .eq("receiver_id", userId)
      .eq("active", true)
      .eq("subject_tag", activeSubject),
    admin
      .from("votes")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    admin
      .from("proposals")
      .select("*", { count: "exact", head: true })
      .eq("author_id", userId),
  ]);

  const accreditationWeight = (accResult.data ?? []).reduce(
    (s: number, a: any) => s + (a.weight ?? 1),
    0
  );
  const votesCast = votesResult.count ?? 0;
  const proposalsAuthored = propsResult.count ?? 0;

  let delegationsReceived = 0;
  let communitiesJoined = 0;
  let totalEarnings = 0;

  if (communityIds.length > 0) {
    const [del, mems, earn] = await Promise.all([
      admin
        .from("delegations")
        .select("*", { count: "exact", head: true })
        .eq("delegate_id", userId)
        .eq("active", true)
        .in("community_id", communityIds),
      admin
        .from("community_memberships")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .in("community_id", communityIds),
      admin
        .from("earnings")
        .select("amount")
        .eq("user_id", userId)
        .in("community_id", communityIds),
    ]);
    delegationsReceived = del.count ?? 0;
    communitiesJoined = mems.count ?? 0;
    totalEarnings = (earn.data ?? []).reduce(
      (s: number, e: any) => s + Number(e.amount),
      0
    );
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

  const statItems = [
    { label: "Delegations received", value: delegationsReceived },
    { label: "Accreditation weight", value: accreditationWeight },
    { label: "Votes cast", value: votesCast },
    { label: "Proposals authored", value: proposalsAuthored },
    { label: "Communities joined", value: communitiesJoined },
    { label: "LOOP earned", value: totalEarnings.toLocaleString(undefined, { maximumFractionDigits: 0 }) },
  ];

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
          style={{
            background: `radial-gradient(circle at 50% 0%, ${tier.color}08, transparent 70%)`,
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full text-lg font-bold"
              style={{
                backgroundColor: `${tier.color}15`,
                color: tier.color,
                border: `2px solid ${tier.color}40`,
              }}
            >
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name ?? ""}
                  className="h-full w-full object-cover"
                />
              ) : (
                profile.display_name?.[0]?.toUpperCase() ?? "?"
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold">{profile.display_name}</h2>
              <p className="text-xs text-muted-foreground">
                {label} Governor
              </p>
            </div>
            <div className="ml-auto text-right">
              <Badge
                variant="outline"
                className="mb-1 text-xs font-bold"
                style={{ color: tier.color, borderColor: `${tier.color}40` }}
              >
                {tier.name}
              </Badge>
              <p
                className="text-3xl font-black tabular-nums"
                style={{ color: tier.color }}
              >
                {powerScore}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Power score
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, (powerScore / 500) * 100)}%`,
                backgroundColor: tier.color,
                boxShadow: `0 0 6px ${tier.color}`,
              }}
            />
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
