// ─── Types ──────────────────────────────────────────────────────────────────

export type TreeEdgeType = "delegation" | "accreditation";

export interface TreeNode {
  id: string;
  parentId: string | null;
  name: string;
  /** PageRank score 0–1; drives node size and edge width */
  score: number;
  edgeType: TreeEdgeType;
  depth: 1 | 2 | 3;
}

export interface TreeData {
  nodes: TreeNode[];
  tailCount: number;
}

export interface TreeSVGOptions {
  tree: TreeData;
  tierColor: string;
  powerScore: number;
  tier: string;
  userName: string;
  subject: string;
  delegators: number;
  networkTotal: number;
  votes: number;
  proposals: number;
  communities: number;
  /** "badge" = full card with header/footer overlays (default); "og" = tree only */
  mode?: "badge" | "og";
}

// ─── Fetcher ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchPowerTree(userId: string, subject: string, admin: any): Promise<TreeData> {
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

// ─── Demo data ──────────────────────────────────────────────────────────────

export type TierSlug = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export interface DemoConfig {
  powerScore: number;
  tier: "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";
  tierColor: string;
  tierGlow: string;
  delegators: number;
  networkTotal: number;
  votes: number;
  proposals: number;
  communities: number;
  tree: TreeData;
}

const DEMO_NAMES = [
  "A. Chen", "B. Patel", "C. Smith", "D. Kim", "E. Brown",
  "F. Jones", "G. Liu", "H. Garcia", "I. Taylor", "J. Wong",
  "K. Martin", "L. Davis", "M. Wilson", "N. Moore", "O. Lee",
  "P. Thomas", "Q. Jackson", "R. White", "S. Harris", "T. Clark",
  "U. Lewis", "V. Hall", "W. Allen", "X. Young", "Y. King",
];

function makeDemoTree(l1: number, l2: number, l3: number, tailCount: number): TreeData {
  const nodes: TreeNode[] = [];
  let ni = 0;
  const name = () => DEMO_NAMES[ni++ % DEMO_NAMES.length];

  for (let i = 0; i < l1; i++) {
    nodes.push({ id: `l1_${i}`, parentId: "root", name: name(), score: Math.max(0.1, 0.9 - i * (0.7 / Math.max(1, l1 - 1))), edgeType: i % 5 === 4 ? "accreditation" : "delegation", depth: 1 });
  }
  for (let i = 0; i < l2; i++) {
    nodes.push({ id: `l2_${i}`, parentId: `l1_${i % l1}`, name: name(), score: Math.max(0.05, 0.65 - i * (0.55 / Math.max(1, l2 - 1))), edgeType: i % 7 === 5 ? "accreditation" : "delegation", depth: 2 });
  }
  for (let i = 0; i < l3; i++) {
    nodes.push({ id: `l3_${i}`, parentId: `l2_${i % Math.max(1, l2)}`, name: "", score: 0.15, edgeType: "delegation", depth: 3 });
  }
  return { nodes, tailCount };
}

export const DEMO_TIERS: Record<TierSlug, DemoConfig> = {
  bronze: {
    powerScore: 25, tier: "Bronze", tierColor: "#cd7f32", tierGlow: "rgba(205,127,50,0.3)",
    delegators: 1, networkTotal: 2, votes: 3, proposals: 0, communities: 1,
    tree: makeDemoTree(1, 1, 0, 0),
  },
  silver: {
    powerScore: 55, tier: "Silver", tierColor: "#94a3b8", tierGlow: "rgba(148,163,184,0.3)",
    delegators: 3, networkTotal: 8, votes: 8, proposals: 1, communities: 2,
    tree: makeDemoTree(3, 5, 0, 5),
  },
  gold: {
    powerScore: 120, tier: "Gold", tierColor: "#f59e0b", tierGlow: "rgba(245,158,11,0.35)",
    delegators: 6, networkTotal: 21, votes: 12, proposals: 3, communities: 4,
    tree: makeDemoTree(6, 15, 0, 12),
  },
  platinum: {
    powerScore: 280, tier: "Platinum", tierColor: "#e5e4e2", tierGlow: "rgba(229,228,226,0.35)",
    delegators: 10, networkTotal: 46, votes: 18, proposals: 5, communities: 7,
    tree: makeDemoTree(10, 28, 8, 25),
  },
  diamond: {
    powerScore: 650, tier: "Diamond", tierColor: "#b9f2ff", tierGlow: "rgba(185,242,255,0.4)",
    delegators: 16, networkTotal: 81, votes: 24, proposals: 8, communities: 12,
    tree: makeDemoTree(16, 45, 20, 60),
  },
};

// ─── SVG Generator ──────────────────────────────────────────────────────────

type Placed = TreeNode & { x: number; y: number; r: number; angle: number };

function placeNodes(nodes: TreeNode[], cx: number, cy: number, R: number[]): Placed[] {
  const map = new Map<string, Placed>();
  const L1 = nodes.filter(n => n.depth === 1);
  const L2 = nodes.filter(n => n.depth === 2);
  const L3 = nodes.filter(n => n.depth === 3);

  L1.forEach((n, i) => {
    const angle = (i / L1.length) * Math.PI * 2 - Math.PI / 2;
    map.set(n.id, { ...n, angle, x: cx + R[1] * Math.cos(angle), y: cy + R[1] * Math.sin(angle), r: 7 + n.score * 11 });
  });

  const by2 = new Map<string, TreeNode[]>();
  L2.forEach(n => { const a = by2.get(n.parentId!) ?? []; a.push(n); by2.set(n.parentId!, a); });
  by2.forEach((ch, pid) => {
    const par = map.get(pid);
    if (!par) return;
    ch.forEach((n, i) => {
      const off = ch.length === 1 ? 0 : (i / (ch.length - 1) - 0.5) * 0.5;
      const angle = par.angle + off;
      map.set(n.id, { ...n, angle, x: cx + R[2] * Math.cos(angle), y: cy + R[2] * Math.sin(angle), r: 4 + n.score * 7 });
    });
  });

  const by3 = new Map<string, TreeNode[]>();
  L3.forEach(n => { const a = by3.get(n.parentId!) ?? []; a.push(n); by3.set(n.parentId!, a); });
  by3.forEach((ch, pid) => {
    const par = map.get(pid);
    if (!par) return;
    ch.forEach((n, i) => {
      const off = ch.length === 1 ? 0 : (i / (ch.length - 1) - 0.5) * 0.28;
      const angle = par.angle + off;
      map.set(n.id, { ...n, angle, x: cx + R[3] * Math.cos(angle), y: cy + R[3] * Math.sin(angle), r: 3 });
    });
  });

  return [...map.values()];
}

export function generateTreeSVG(opts: TreeSVGOptions): string {
  const W = 500, H = 582, cx = 250, cy = 268;
  const R = [0, 92, 165, 232];
  const tc = opts.tierColor;
  const placed = placeNodes(opts.tree.nodes, cx, cy, R);
  const f = (n: number) => n.toFixed(1);

  const qPath = (x1: number, y1: number, x2: number, y2: number) => {
    const cpx = (x1 + x2) / 2 * 0.87 + cx * 0.13;
    const cpy = (y1 + y2) / 2 * 0.87 + cy * 0.13;
    return `M ${f(x1)} ${f(y1)} Q ${f(cpx)} ${f(cpy)} ${f(x2)} ${f(y2)}`;
  };

  // Edges
  const edges: string[] = [];
  placed.forEach(n => {
    if (n.depth === 3) {
      const par = placed.find(p => p.id === n.parentId);
      if (par) edges.push(`<path d="${qPath(par.x, par.y, n.x, n.y)}" fill="none" stroke="${tc}" stroke-opacity="0.14" stroke-width="0.8"/>`);
      return;
    }
    const par = n.depth === 1 ? { x: cx, y: cy } : placed.find(p => p.id === n.parentId) ?? { x: cx, y: cy };
    const sw = n.edgeType === "delegation" ? f(0.8 + n.score * 2.2) : "1.0";
    const sop = n.edgeType === "delegation" ? f(0.13 + n.score * 0.55) : f(0.10 + n.score * 0.14);
    const dash = n.edgeType === "accreditation" ? ' stroke-dasharray="3 5"' : "";
    edges.push(`<path d="${qPath(par.x, par.y, n.x, n.y)}" fill="none" stroke="${tc}" stroke-opacity="${sop}" stroke-width="${sw}"${dash}/>`);
  });

  // Nodes
  const nodeEls: string[] = [];

  placed.filter(n => n.depth === 3).forEach(n => {
    nodeEls.push(`<circle cx="${f(n.x)}" cy="${f(n.y)}" r="3" fill="#0d0d0d" stroke="${tc}" stroke-opacity="0.50" stroke-width="1.5"/>`);
  });

  placed.filter(n => n.depth === 2).forEach(n => {
    const dash = n.edgeType === "accreditation" ? ' stroke-dasharray="2 2.5"' : "";
    const sop = n.edgeType === "accreditation" ? f(0.28 + n.score * 0.32) : f(0.42 + n.score * 0.48);
    nodeEls.push(`<circle cx="${f(n.x)}" cy="${f(n.y)}" r="${f(n.r)}" fill="#0d0d0d" stroke="${tc}" stroke-opacity="${sop}" stroke-width="1.5"${dash}/>`);
  });

  placed.filter(n => n.depth === 1).forEach(n => {
    const dash = n.edgeType === "accreditation" ? ' stroke-dasharray="2 2.5"' : "";
    const sop = n.edgeType === "accreditation" ? f(0.30 + n.score * 0.35) : f(0.45 + n.score * 0.50);
    nodeEls.push(`<circle cx="${f(n.x)}" cy="${f(n.y)}" r="${f(n.r)}" fill="#0d0d0d" stroke="${tc}" stroke-opacity="${sop}" stroke-width="1.5"${dash}/>`);
    // Label: push outward beyond node edge
    const dist = R[1] + n.r + 9;
    const lx = f(cx + dist * Math.cos(n.angle));
    const lyBase = cy + dist * Math.sin(n.angle);
    const anchor = n.x > cx + 20 ? "start" : n.x < cx - 20 ? "end" : "middle";
    const nm = n.name.length > 9 ? n.name.slice(0, 8) + "." : n.name;
    nodeEls.push(`<text x="${lx}" y="${f(lyBase - 4)}" text-anchor="${anchor}" font-family="system-ui" font-weight="600" font-size="8.5" fill="rgba(229,229,229,0.78)">${nm}</text>`);
    nodeEls.push(`<text x="${lx}" y="${f(lyBase + 6)}" text-anchor="${anchor}" font-family="monospace" font-size="7" fill="${tc}" fill-opacity="${f(0.55 + n.score * 0.35)}">${n.score.toFixed(2)}</text>`);
  });

  // Root glow + fill
  nodeEls.push(`<circle cx="${cx}" cy="${cy}" r="105" fill="url(#rg)"/>`);
  nodeEls.push(`<circle cx="${cx}" cy="${cy}" r="33" fill="${tc}"/>`);
  nodeEls.push(`<text x="${cx}" y="${cy + 7}" text-anchor="middle" font-family="system-ui" font-weight="900" font-size="19" fill="rgba(0,0,0,0.85)">${Math.round(opts.powerScore)}</text>`);
  nodeEls.push(`<text x="${cx}" y="${cy + 18}" text-anchor="middle" font-family="system-ui" font-weight="700" font-size="9" fill="rgba(0,0,0,0.52)">pts</text>`);

  // Overlays (badge mode only)
  let overlays = "";
  if (opts.mode !== "og") {
    const initials = (opts.userName.split(/\s+/).map(w => w[0] ?? "").join("").slice(0, 2) || "?").toUpperCase();
    const tierLabel = opts.tier.toUpperCase();
    const tierW = tierLabel.length > 5 ? 56 : 46;
    const tierX = W - 20 - tierW;
    const tailLabel = opts.tree.tailCount > 0 ? `+${opts.tree.tailCount}` : "0";

    overlays = `
  <rect x="0" y="0" width="${W}" height="90" fill="url(#hg)"/>
  <rect x="0" y="0" width="${W}" height="2" fill="url(#al)"/>
  <text x="20" y="27" font-family="system-ui" font-size="10" fill="rgba(75,75,75,0.9)">Loop_cmbntr</text>
  <rect x="${tierX}" y="10" width="${tierW}" height="20" rx="5" fill="${tc}" fill-opacity="0.09" stroke="${tc}" stroke-opacity="0.28" stroke-width="1"/>
  <text x="${(tierX + tierW / 2).toFixed(0)}" y="24" text-anchor="middle" font-family="system-ui" font-weight="700" font-size="9" fill="${tc}">${tierLabel}</text>
  <circle cx="30" cy="58" r="20" fill="${tc}" fill-opacity="0.12" stroke="${tc}" stroke-opacity="0.32" stroke-width="1.5"/>
  <text x="30" y="62" text-anchor="middle" font-family="system-ui" font-weight="700" font-size="11" fill="${tc}">${initials}</text>
  <text x="60" y="52" font-family="system-ui" font-weight="700" font-size="14" fill="rgba(235,235,235,0.88)">${opts.userName}</text>
  <text x="60" y="68" font-family="system-ui" font-size="10.5" fill="${tc}" fill-opacity="0.72">${opts.subject} Governor</text>
  <rect x="0" y="${H - 122}" width="${W}" height="122" fill="url(#sg)"/>
  <line x1="60" y1="${H - 102}" x2="${W - 60}" y2="${H - 102}" stroke="${tc}" stroke-opacity="0.22" stroke-width="1"/>
  <text x="${Math.round(W / 6)}" y="${H - 63}" text-anchor="middle" font-family="system-ui" font-weight="800" font-size="28" fill="rgba(245,245,245,0.92)">${opts.delegators}</text>
  <text x="${Math.round(W / 6)}" y="${H - 50}" text-anchor="middle" font-family="system-ui" font-size="8" fill="rgba(130,130,130,0.7)">DELEGATING TO YOU</text>
  <text x="${cx}" y="${H - 63}" text-anchor="middle" font-family="system-ui" font-weight="800" font-size="28" fill="rgba(245,245,245,0.92)">${opts.networkTotal}</text>
  <text x="${cx}" y="${H - 50}" text-anchor="middle" font-family="system-ui" font-size="8" fill="rgba(130,130,130,0.7)">TOTAL IN NETWORK</text>
  <text x="${Math.round(W * 5 / 6)}" y="${H - 63}" text-anchor="middle" font-family="system-ui" font-weight="800" font-size="28" fill="rgba(245,245,245,0.92)">${tailLabel}</text>
  <text x="${Math.round(W * 5 / 6)}" y="${H - 50}" text-anchor="middle" font-family="system-ui" font-size="8" fill="rgba(130,130,130,0.7)">BEYOND LAYER 3</text>
  <line x1="${Math.round(W / 3)}" y1="${H - 110}" x2="${Math.round(W / 3)}" y2="${H - 45}" stroke="rgba(60,60,60,0.6)" stroke-width="1"/>
  <line x1="${Math.round(W * 2 / 3)}" y1="${H - 110}" x2="${Math.round(W * 2 / 3)}" y2="${H - 45}" stroke="rgba(60,60,60,0.6)" stroke-width="1"/>
  <text x="${cx}" y="${H - 31}" text-anchor="middle" font-family="system-ui" font-size="11" fill="rgba(80,80,80,0.9)">${opts.votes} votes  ·  ${opts.proposals} proposals  ·  ${opts.communities} communities</text>
  <text x="${cx}" y="${H - 14}" text-anchor="middle" font-family="system-ui" font-size="9" fill="rgba(60,60,60,0.8)">gov.loopcmbntr.live</text>`;
  }

  const defs = `
    <radialGradient id="cg" cx="50%" cy="46%" r="55%">
      <stop offset="0%" stop-color="${tc}" stop-opacity="0.13"/>
      <stop offset="45%" stop-color="${tc}" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="${tc}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vg" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.48"/>
    </radialGradient>
    <radialGradient id="rg" cx="${cx}" cy="${cy}" r="105" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${tc}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${tc}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#090909" stop-opacity="0.96"/>
      <stop offset="70%" stop-color="#090909" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#090909" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#090909" stop-opacity="0"/>
      <stop offset="22%" stop-color="#090909" stop-opacity="0.88"/>
      <stop offset="100%" stop-color="#090909" stop-opacity="0.97"/>
    </linearGradient>
    <linearGradient id="al" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${tc}" stop-opacity="0"/>
      <stop offset="25%" stop-color="${tc}" stop-opacity="0.85"/>
      <stop offset="75%" stop-color="${tc}" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="${tc}" stop-opacity="0"/>
    </linearGradient>`;

  const rings = R.slice(1).map(r => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${tc}" stroke-opacity="0.05" stroke-width="1"/>`).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
  <defs>${defs}
  </defs>
  <rect width="${W}" height="${H}" fill="#090909"/>
  <rect width="${W}" height="${H}" fill="url(#cg)"/>
  <rect width="${W}" height="${H}" fill="url(#vg)"/>
  ${rings}
  ${edges.join("\n  ")}
  ${nodeEls.join("\n  ")}${overlays}
</svg>`;
}
