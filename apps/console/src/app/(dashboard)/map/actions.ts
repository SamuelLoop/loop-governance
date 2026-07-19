"use server";

import { createServiceClient } from "@/lib/supabase-server";
import { getActiveSubject } from "@/lib/subject";

export type MapCommunity = {
  id: string;
  name: string;
  level: string;
  memberCount: number;
  lat: number;
  lng: number;
  parentId: string | null;
};

const CITY_COORDS: Record<string, [number, number]> = {
  Paris: [48.8566, 2.3522],
  London: [51.5074, -0.1278],
  Berlin: [52.52, 13.405],
  Munich: [48.1351, 11.582],
  "New York": [40.7128, -74.006],
  "Los Angeles": [34.0522, -118.2437],
  Chicago: [41.8781, -87.6298],
  Houston: [29.7604, -95.3698],
  Miami: [25.7617, -80.1918],
  Toronto: [43.6532, -79.3832],
  Vancouver: [49.2827, -123.1207],
  Montreal: [45.5017, -73.5673],
  Tokyo: [35.6762, 139.6503],
  Sydney: [-33.8688, 151.2093],
  Melbourne: [-37.8136, 144.9631],
  Lagos: [6.5244, 3.3792],
  Nairobi: [-1.2921, 36.8219],
  "Cape Town": [-33.9249, 18.4241],
  Cairo: [30.0444, 31.2357],
  "São Paulo": [-23.5505, -46.6333],
  "Mexico City": [19.4326, -99.1332],
  Mumbai: [19.076, 72.8777],
  Delhi: [28.7041, 77.1025],
  Shanghai: [31.2304, 121.4737],
  Beijing: [39.9042, 116.4074],
  Seoul: [37.5665, 126.978],
  Singapore: [1.3521, 103.8198],
};

const COUNTRY_COORDS: Record<string, [number, number]> = {
  USA: [39.8283, -98.5795],
  "United States": [39.8283, -98.5795],
  Canada: [56.1304, -106.3468],
  France: [46.2276, 2.2137],
  Germany: [51.1657, 10.4515],
  UK: [55.3781, -3.436],
  "United Kingdom": [55.3781, -3.436],
  Japan: [36.2048, 138.2529],
  Australia: [-25.2744, 133.7751],
  Nigeria: [9.082, 8.6753],
  Kenya: [-0.0236, 37.9062],
  "South Africa": [-30.5595, 22.9375],
  Egypt: [26.8206, 30.8025],
  Brazil: [-14.235, -51.9253],
  Mexico: [23.6345, -102.5528],
  India: [20.5937, 78.9629],
  China: [35.8617, 104.1954],
  "South Korea": [35.9078, 127.7669],
};

const CONTINENT_COORDS: Record<string, [number, number]> = {
  Europe: [54.526, 15.2551],
  Americas: [19.0, -80.0],
  "North America": [54.526, -105.2551],
  "South America": [-8.7832, -55.4915],
  Asia: [34.0479, 100.6197],
  Africa: [8.7832, 34.5085],
  Oceania: [-22.7359, 140.0188],
};

function coordsForCommunity(
  name: string,
  level: string
): [number, number] | null {
  if (level === "global") return [20, 0];
  if (level === "continental") return CONTINENT_COORDS[name] ?? null;
  if (level === "national") return COUNTRY_COORDS[name] ?? null;
  if (level === "city" || level === "local" || level === "micro")
    return CITY_COORDS[name] ?? null;
  return null;
}

export async function getMapData(): Promise<MapCommunity[]> {
  const admin = createServiceClient();
  const activeSubject = await getActiveSubject();

  const { data: communities } = await admin
    .from("communities")
    .select("id, name, level, parent_id, h3_index")
    .eq("subject", activeSubject)
    .order("level");

  if (!communities) return [];

  const results: MapCommunity[] = [];

  for (const c of communities) {
    const coords = coordsForCommunity(c.name, c.level);
    if (!coords) continue;

    const { count } = await admin
      .from("community_memberships")
      .select("*", { count: "exact", head: true })
      .eq("community_id", c.id);
    const memberCount = count ?? 0;

    results.push({
      id: c.id,
      name: c.name,
      level: c.level,
      memberCount,
      lat: coords[0],
      lng: coords[1],
      parentId: c.parent_id,
    });
  }

  return results;
}
