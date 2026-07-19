import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const LEVEL_ORDER = [
  "global",
  "continental",
  "national",
  "state",
  "city",
  "local",
  "micro",
] as const;

function nextLevel(current: string): string | null {
  const idx = LEVEL_ORDER.indexOf(current as any);
  if (idx < 0 || idx >= LEVEL_ORDER.length - 1) return null;
  return LEVEL_ORDER[idx + 1];
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Geographic containment: location_name is "City, Country"
// We parse this into a hierarchy: Continent > Country > City

const COUNTRY_TO_CONTINENT: Record<string, string> = {
  // Africa
  "Nigeria": "Africa", "South Africa": "Africa", "Kenya": "Africa",
  "Ghana": "Africa", "Ethiopia": "Africa", "Tanzania": "Africa",
  "Egypt": "Africa", "Morocco": "Africa", "Senegal": "Africa",
  "Uganda": "Africa", "Rwanda": "Africa", "Cameroon": "Africa",
  // Americas
  "USA": "Americas", "Canada": "Americas", "Mexico": "Americas",
  "Brazil": "Americas", "Argentina": "Americas", "Colombia": "Americas",
  "Chile": "Americas", "Peru": "Americas", "Venezuela": "Americas",
  "Ecuador": "Americas", "Cuba": "Americas", "Costa Rica": "Americas",
  "Jamaica": "Americas", "Trinidad and Tobago": "Americas",
  // Asia
  "Japan": "Asia", "India": "Asia", "China": "Asia",
  "South Korea": "Asia", "Indonesia": "Asia", "Thailand": "Asia",
  "Vietnam": "Asia", "Philippines": "Asia", "Malaysia": "Asia",
  "Singapore": "Asia", "Pakistan": "Asia", "Bangladesh": "Asia",
  "Sri Lanka": "Asia", "Nepal": "Asia", "Myanmar": "Asia",
  "Taiwan": "Asia", "Hong Kong": "Asia",
  // Europe
  "UK": "Europe", "France": "Europe", "Germany": "Europe",
  "Italy": "Europe", "Spain": "Europe", "Netherlands": "Europe",
  "Belgium": "Europe", "Switzerland": "Europe", "Austria": "Europe",
  "Sweden": "Europe", "Norway": "Europe", "Denmark": "Europe",
  "Finland": "Europe", "Poland": "Europe", "Portugal": "Europe",
  "Ireland": "Europe", "Czech Republic": "Europe", "Romania": "Europe",
  "Greece": "Europe", "Hungary": "Europe", "Croatia": "Europe",
  "Serbia": "Europe", "Bulgaria": "Europe", "Slovakia": "Europe",
  "Lithuania": "Europe", "Latvia": "Europe", "Estonia": "Europe",
  "Slovenia": "Europe", "Iceland": "Europe", "Luxembourg": "Europe",
  // Middle East
  "UAE": "Middle East", "Saudi Arabia": "Middle East",
  "Israel": "Middle East", "Turkey": "Middle East",
  "Qatar": "Middle East", "Kuwait": "Middle East",
  "Bahrain": "Middle East", "Oman": "Middle East",
  "Jordan": "Middle East", "Lebanon": "Middle East",
  "Iran": "Middle East", "Iraq": "Middle East",
  // Oceania
  "Australia": "Oceania", "New Zealand": "Oceania",
  "Fiji": "Oceania", "Papua New Guinea": "Oceania",
  // Central Asia / Russia
  "Russia": "Europe", "Ukraine": "Europe",
  "Kazakhstan": "Asia", "Uzbekistan": "Asia",
};

type ParsedLocation = {
  city: string;
  country: string;
  continent: string;
};

function parseLocation(locationName: string | null): ParsedLocation | null {
  if (!locationName) return null;
  const parts = locationName.split(", ").map((s) => s.trim());
  if (parts.length < 2) return null;

  const city = parts[0];
  const country = parts[parts.length - 1];
  const continent = COUNTRY_TO_CONTINENT[country] ?? "Other";

  return { city, country, continent };
}

/**
 * Get the geographic grouping key for a member based on what level
 * the parent community is at.
 *
 * global     -> group by continent
 * continental -> group by country
 * national   -> group by city
 * city/state -> no further geographic split available from location_name
 */
function groupingKey(
  parentLevel: string,
  location: ParsedLocation | null
): string {
  if (!location) return "Unlocated";

  switch (parentLevel) {
    case "global":
      return location.continent;
    case "continental":
      return location.country;
    case "national":
    case "state":
      return location.city;
    default:
      return location.city;
  }
}

type MemberRow = {
  user_id: string;
  location: ParsedLocation | null;
};

/**
 * Check if a community has exceeded its Dunbar limit and split if needed.
 * Creates sub-communities based on geographic containment:
 *   Global -> Continents -> Countries -> Cities
 *
 * Every member is placed in their geographic sub-community AND retains
 * membership in all parent communities (they live inside all of them).
 */
export async function checkAndSplit(communityId: string): Promise<string[]> {
  const admin = getServiceClient();

  const { data: community } = await admin
    .from("communities")
    .select("*")
    .eq("id", communityId)
    .single();

  if (!community) return [];

  const { count } = await admin
    .from("community_memberships")
    .select("id", { count: "exact", head: true })
    .eq("community_id", communityId);

  if (!count || count <= community.dunbar_limit) return [];

  const childLevel = nextLevel(community.level);
  if (!childLevel) return [];

  // Fetch all members with their user location data
  const { data: memberships } = await admin
    .from("community_memberships")
    .select("user_id")
    .eq("community_id", communityId);

  if (!memberships || memberships.length === 0) return [];

  const userIds = memberships.map((m) => m.user_id);
  const { data: users } = await admin
    .from("users")
    .select("id, h3_index, location_name")
    .in("id", userIds);

  if (!users) return [];

  const userMap = new Map(users.map((u) => [u.id, u]));

  const members: MemberRow[] = memberships.map((m) => ({
    user_id: m.user_id,
    location: parseLocation(userMap.get(m.user_id)?.location_name ?? null),
  }));

  // Group by geographic containment
  const clusters = new Map<string, MemberRow[]>();
  for (const m of members) {
    const key = groupingKey(community.level, m.location);
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key)!.push(m);
  }

  // Don't split if everything ends up in one cluster
  if (clusters.size <= 1) return [];

  // Check existing children to avoid duplicates
  const { data: existingChildren } = await admin
    .from("communities")
    .select("id, slug")
    .eq("parent_id", communityId);

  const existingSlugs = new Set(
    (existingChildren ?? []).map((c: any) => c.slug)
  );

  const newCommunityIds: string[] = [];

  for (const [name, clusterMembers] of clusters) {
    if (clusterMembers.length === 0) continue;

    const slug = slugify(name);
    if (existingSlugs.has(slug)) continue;

    const pathSegment = slug.replace(/-/g, "_");
    const path = community.path
      ? `${community.path}.${pathSegment}`
      : pathSegment;

    // Pick h3_index from the first member that has one
    const representativeUser = users.find(
      (u) =>
        u.h3_index &&
        clusterMembers.some((m) => m.user_id === u.id)
    );

    const { data: newCommunity, error: createErr } = await admin
      .from("communities")
      .insert({
        name,
        slug,
        level: childLevel,
        path,
        parent_id: communityId,
        h3_index: representativeUser?.h3_index ?? null,
        h3_cells: [],
        quorum_size: Math.max(3, Math.floor(clusterMembers.length * 0.1)),
        dunbar_limit: community.dunbar_limit,
        subject: community.subject,
        subject_tags: community.subject_tags,
      })
      .select("id")
      .single();

    if (createErr || !newCommunity) {
      console.error(`Failed to create sub-community ${name}:`, createErr);
      continue;
    }

    newCommunityIds.push(newCommunity.id);
    existingSlugs.add(slug);

    // Add members to the new sub-community
    // (they keep their parent community membership)
    const memberRows = clusterMembers.map((m) => ({
      user_id: m.user_id,
      community_id: newCommunity.id,
      role: "member" as const,
    }));

    const { error: memberErr } = await admin
      .from("community_memberships")
      .insert(memberRows);

    if (memberErr) {
      console.error(`Failed to add members to ${name}:`, memberErr);
    }
  }

  // Recursively check if any new community also needs splitting
  for (const newId of [...newCommunityIds]) {
    const childSplits = await checkAndSplit(newId);
    newCommunityIds.push(...childSplits);
  }

  return newCommunityIds;
}

/**
 * Run a full rebalance: check every community for Dunbar overflow,
 * starting from the top of the hierarchy down.
 */
export async function rebalanceAll(): Promise<{
  created: number;
  communities: string[];
}> {
  const admin = getServiceClient();

  const { data: allCommunities } = await admin
    .from("communities")
    .select("id")
    .order("path", { ascending: true });

  if (!allCommunities) return { created: 0, communities: [] };

  const allNew: string[] = [];
  for (const c of allCommunities) {
    const newIds = await checkAndSplit(c.id);
    allNew.push(...newIds);
  }

  return { created: allNew.length, communities: allNew };
}
