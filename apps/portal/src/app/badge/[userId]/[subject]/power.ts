import { createServiceClient } from "@/lib/supabase-server";

export type PowerStats = {
  userName: string;
  avatarUrl: string | null;
  location: string | null;
  subject: string;
  delegationsReceived: number;
  accreditationsReceived: number;
  accreditationWeight: number;
  votesCast: number;
  proposalsAuthored: number;
  communitiesJoined: number;
  totalEarnings: number;
  powerScore: number;
  tier: "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";
  tierColor: string;
  tierGlow: string;
};

const TIERS: { name: PowerStats["tier"]; min: number; color: string; glow: string }[] = [
  { name: "Diamond", min: 500, color: "#b9f2ff", glow: "rgba(185,242,255,0.4)" },
  { name: "Platinum", min: 200, color: "#e5e4e2", glow: "rgba(229,228,226,0.35)" },
  { name: "Gold", min: 80, color: "#f59e0b", glow: "rgba(245,158,11,0.35)" },
  { name: "Silver", min: 30, color: "#94a3b8", glow: "rgba(148,163,184,0.3)" },
  { name: "Bronze", min: 0, color: "#cd7f32", glow: "rgba(205,127,50,0.3)" },
];

function computeTier(score: number) {
  for (const t of TIERS) {
    if (score >= t.min) return t;
  }
  return TIERS[TIERS.length - 1];
}

export async function getPowerStats(
  userId: string,
  subject: string
): Promise<PowerStats | null> {
  const admin = createServiceClient();

  const { data: user } = await admin
    .from("users")
    .select("display_name, avatar_url, location_name")
    .eq("id", userId)
    .single();

  if (!user) return null;

  const { data: subjectCommunities } = await admin
    .from("communities")
    .select("id")
    .eq("subject", subject);

  const communityIds = (subjectCommunities ?? []).map((c) => c.id);

  const [accResult, voteResult, propResult] = await Promise.all([
    admin
      .from("accreditations")
      .select("weight")
      .eq("receiver_id", userId)
      .eq("active", true)
      .eq("subject_tag", subject),
    admin
      .from("votes")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    admin
      .from("proposals")
      .select("*", { count: "exact", head: true })
      .eq("author_id", userId),
  ]);

  const accreditations = accResult.data ?? [];
  const accreditationsReceived = accreditations.length;
  const accreditationWeight = accreditations.reduce(
    (s, a) => s + (a.weight ?? 1),
    0
  );
  const votesCast = voteResult.count ?? 0;
  const proposalsAuthored = propResult.count ?? 0;

  let delegationsReceived = 0;
  let communitiesJoined = 0;
  let totalEarnings = 0;
  if (communityIds.length > 0) {
    const [delResult, memResult, earnResult] = await Promise.all([
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
    delegationsReceived = delResult.count ?? 0;
    communitiesJoined = memResult.count ?? 0;
    totalEarnings = (earnResult.data ?? []).reduce(
      (s, e) => s + Number(e.amount),
      0
    );
  }

  return buildStats(
    user,
    subject,
    delegationsReceived,
    accreditationsReceived,
    accreditationWeight,
    votesCast,
    proposalsAuthored,
    communitiesJoined,
    totalEarnings
  );
}

function buildStats(
  user: { display_name: string | null; avatar_url: string | null; location_name: string | null },
  subject: string,
  delegationsReceived: number,
  accreditationsReceived: number,
  accreditationWeight: number,
  votesCast: number,
  proposalsAuthored: number,
  communitiesJoined: number,
  totalEarnings: number
): PowerStats {
  const powerScore =
    delegationsReceived * 10 +
    accreditationWeight * 5 +
    votesCast * 2 +
    proposalsAuthored * 8 +
    communitiesJoined * 3 +
    Math.floor(totalEarnings * 0.1);

  const tier = computeTier(powerScore);

  return {
    userName: user.display_name ?? "Unknown",
    avatarUrl: user.avatar_url,
    location: user.location_name,
    subject,
    delegationsReceived,
    accreditationsReceived,
    accreditationWeight,
    votesCast,
    proposalsAuthored,
    communitiesJoined,
    totalEarnings,
    powerScore,
    tier: tier.name,
    tierColor: tier.color,
    tierGlow: tier.glow,
  };
}
