import { ImageResponse } from "next/og";
import { DEMO_TIERS, generateTreeSVG, type TierSlug } from "@/lib/power-tree";

export const runtime = "nodejs";

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tier: string; subject: string }> }
) {
  const { tier, subject } = await params;
  const demo = DEMO_TIERS[tier as TierSlug];
  if (!demo) return new Response("Not found", { status: 404 });

  const label = SUBJECT_LABELS[subject] ?? subject;
  const tc = demo.tierColor;

  const treeSvg = generateTreeSVG({
    tree: demo.tree,
    tierColor: tc,
    powerScore: demo.powerScore,
    tier: demo.tier,
    userName: "Demo Governor",
    subject: label,
    delegators: demo.delegators,
    networkTotal: demo.networkTotal,
    votes: demo.votes,
    proposals: demo.proposals,
    communities: demo.communities,
    mode: "og",
  });
  const treeDataUri = `data:image/svg+xml;base64,${Buffer.from(treeSvg).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          background: "#090909",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Ambient glow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "840px",
            transform: "translate(-50%, -50%)",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: demo.tierGlow,
            filter: "blur(80px)",
          }}
        />

        {/* Left: profile info */}
        <div
          style={{
            width: "560px",
            height: "630px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "3px",
              background: `linear-gradient(90deg, transparent, ${tc}, transparent)`,
            }}
          />

          {/* Tier pill */}
          <div
            style={{
              display: "flex",
              padding: "6px 18px",
              borderRadius: "20px",
              border: `1px solid ${tc}40`,
              backgroundColor: `${tc}15`,
              marginBottom: "20px",
            }}
          >
            <span style={{ fontSize: "13px", fontWeight: 800, letterSpacing: "2px", color: tc }}>
              {demo.tier.toUpperCase()}
            </span>
          </div>

          {/* Avatar placeholder */}
          <div
            style={{
              width: "88px", height: "88px", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "36px", fontWeight: 700, color: tc,
              backgroundColor: `${tc}20`, border: `3px solid ${tc}50`,
              marginBottom: "14px",
            }}
          >
            DG
          </div>

          <h1 style={{ fontSize: "40px", fontWeight: 800, color: "#f5f5f5", margin: "0 0 4px 0" }}>
            Demo Governor
          </h1>
          <p style={{ fontSize: "16px", color: tc, margin: "0 0 18px 0" }}>
            {label} Governor
          </p>

          <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "20px" }}>
            <span style={{ fontSize: "70px", fontWeight: 900, color: tc, lineHeight: "1" }}>
              {demo.powerScore}
            </span>
            <span style={{ fontSize: "13px", color: "#737373", letterSpacing: "2px" }}>POWER</span>
          </div>

          <div style={{ display: "flex", gap: "16px" }}>
            {[
              { label: "delegators", value: demo.delegators },
              { label: "in network", value: demo.networkTotal },
              { label: "beyond", value: demo.tree.tailCount > 0 ? `+${demo.tree.tailCount}` : "0" },
            ].map(s => (
              <div
                key={s.label}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  padding: "10px 18px", borderRadius: "10px",
                  backgroundColor: "rgba(38,38,38,0.8)", border: "1px solid rgba(64,64,64,0.5)",
                }}
              >
                <span style={{ fontSize: "26px", fontWeight: 700, color: "#e5e5e5" }}>{s.value}</span>
                <span style={{ fontSize: "10px", color: "#737373" }}>{s.label}</span>
              </div>
            ))}
          </div>

          <p style={{ position: "absolute", bottom: "18px", fontSize: "12px", color: "#404040" }}>
            gov.loopcmbntr.live
          </p>
        </div>

        {/* Right: tree SVG */}
        <div
          style={{
            width: "640px",
            height: "630px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <img src={treeDataUri} style={{ width: "541px", height: "630px" }} />
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );
}
