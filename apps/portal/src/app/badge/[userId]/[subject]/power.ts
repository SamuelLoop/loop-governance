import { createServiceClient } from "@/lib/supabase-server";
import { getDb } from "@/lib/db";
import { kv } from "@/lib/kv";

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
  { name: "Gold",    min: 80,  color: "#f59e0b", glow: "rgba(245,158,11,0.35)" },
  { name: "Silver",  min: 30,  color: "#94a3b8", glow: "rgba(148,163,184,0.3)" },
  { name: "Bronze",  min: 0,   color: "#cd7f32", glow: "rgba(205,127,50,0.3)" },
];

function computeTier(score: number) {
  for (const t of TIERS) {
    if (score >= t.min) return t;
  }
  return TIERS[TIERS.length - 1];
}

export async function invalidatePowerCache(userId: string, subject: string): Promise<void> {
  await kv.del(`power:${userId}:${subject}`);
}

export async function getPowerStats(
  userId: string,
  subject: string
): Promise<PowerStats | null> {
  const cacheKey = `power:${userId}:${subject}`;

  // KV cache layer (circuit-break on failure)
  try {
    const cached = await kv.get<PowerStats>(cacheKey);
    if (cached) return cached;
  } catch {
    // KV unavailable — fall through to DB
  }

  const admin = createServiceClient();
  const sql = getDb();

  // Parallel: user profile (Supabase client) + pre-computed power row via pooler
  type ScoreRow = {
    score: number; tier: string; delegations_received: number;
    accreditations_received: number; accreditation_weight: number;
    votes_cast: number; proposals_authored: number; communities_joined: number;
    total_earnings: number;
  };

  const [userRes, scoreRows] = await Promise.all([
    admin
      .from("users")
      .select("display_name, avatar_url, location_name")
      .eq("id", userId)
      .single(),
    sql<ScoreRow[]>`
      SELECT score, tier, delegations_received, accreditations_received,
             accreditation_weight, votes_cast, proposals_authored,
             communities_joined, total_earnings
      FROM user_power_scores
      WHERE user_id = ${userId} AND subject = ${subject}
    `,
  ]);

  const user = userRes.data;
  if (!user) return null;

  let stats: PowerStats;

  const scoreRow = scoreRows[0] ?? null;

  if (scoreRow) {
    const row = scoreRow;
    const tier = computeTier(Number(row.score));
    stats = {
      userName: user.display_name ?? "Unknown",
      avatarUrl: user.avatar_url,
      location: user.location_name,
      subject,
      delegationsReceived: row.delegations_received,
      accreditationsReceived: row.accreditations_received,
      accreditationWeight: Number(row.accreditation_weight),
      votesCast: row.votes_cast,
      proposalsAuthored: row.proposals_authored,
      communitiesJoined: row.communities_joined,
      totalEarnings: Number(row.total_earnings),
      powerScore: Number(row.score),
      tier: tier.name,
      tierColor: tier.color,
      tierGlow: tier.glow,
    };
  } else {
    // Fallback: compute live (new user before first trigger fires)
    stats = await computeLive(admin, user, userId, subject);
  }

  try {
    await kv.set(cacheKey, stats, { ex: 300 });
  } catch {
    // ignore
  }

  return stats;
}

// buildStats is exported so tests can verify formula parity with SQL recompute_power_score()
export function buildStats(
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

async function computeLive(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  user: { display_name: string | null; avatar_url: string | null; location_name: string | null },
  userId: string,
  subject: string
): Promise<PowerStats> {
  const sql = getDb();

  const { data: subjectCommunities } = await admin
    .from("communities")
    .select("id")
    .eq("subject", subject);

  const communityIds = (subjectCommunities ?? []).map((c: { id: string }) => c.id);

  const [accResult, countRows] = await Promise.all([
    admin
      .from("accreditations")
      .select("weight")
      .eq("receiver_id", userId)
      .eq("active", true)
      .eq("subject_tag", subject),
    sql<{ votes_cast: number; proposals_authored: number }[]>`
      SELECT votes_cast, proposals_authored
      FROM user_vote_proposal_counts
      WHERE user_id = ${userId}
    `,
  ]);

  const accreditations = accResult.data ?? [];
  const accreditationsReceived = accreditations.length;
  const accreditationWeight = accreditations.reduce(
    (s: number, a: { weight?: number }) => s + (a.weight ?? 1),
    0
  );
  const counts = countRows[0] ?? null;
  const votesCast = counts?.votes_cast ?? 0;
  const proposalsAuthored = counts?.proposals_authored ?? 0;

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
      (s: number, e: { amount: string }) => s + Number(e.amount),
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
