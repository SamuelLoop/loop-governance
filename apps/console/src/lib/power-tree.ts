// Shared with apps/portal/src/lib/power-tree.ts — keep in sync

export type TreeEdgeType = "delegation" | "accreditation";

export interface TreeNode {
  id: string;
  parentId: string | null;
  name: string;
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
  mode?: "badge" | "og";
}

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
    const dist = R[1] + n.r + 9;
    const lx = f(cx + dist * Math.cos(n.angle));
    const lyBase = cy + dist * Math.sin(n.angle);
    const anchor = n.x > cx + 20 ? "start" : n.x < cx - 20 ? "end" : "middle";
    const nm = n.name.length > 9 ? n.name.slice(0, 8) + "." : n.name;
    nodeEls.push(`<text x="${lx}" y="${f(lyBase - 4)}" text-anchor="${anchor}" font-family="system-ui" font-weight="600" font-size="8.5" fill="rgba(229,229,229,0.78)">${nm}</text>`);
    nodeEls.push(`<text x="${lx}" y="${f(lyBase + 6)}" text-anchor="${anchor}" font-family="monospace" font-size="7" fill="${tc}" fill-opacity="${f(0.55 + n.score * 0.35)}">${n.score.toFixed(2)}</text>`);
  });

  nodeEls.push(`<circle cx="${cx}" cy="${cy}" r="105" fill="url(#rg)"/>`);
  nodeEls.push(`<circle cx="${cx}" cy="${cy}" r="33" fill="${tc}"/>`);
  nodeEls.push(`<text x="${cx}" y="${cy + 7}" text-anchor="middle" font-family="system-ui" font-weight="900" font-size="19" fill="rgba(0,0,0,0.85)">${Math.round(opts.powerScore)}</text>`);
  nodeEls.push(`<text x="${cx}" y="${cy + 18}" text-anchor="middle" font-family="system-ui" font-weight="700" font-size="9" fill="rgba(0,0,0,0.52)">pts</text>`);

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
