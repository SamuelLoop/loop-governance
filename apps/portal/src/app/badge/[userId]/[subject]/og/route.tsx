import { ImageResponse } from "next/og";
import { getPowerStats } from "../power";

export const runtime = "edge";

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
  { params }: { params: Promise<{ userId: string; subject: string }> }
) {
  const { userId, subject } = await params;
  const stats = await getPowerStats(userId, subject);

  if (!stats) {
    return new Response("Not found", { status: 404 });
  }

  const label = SUBJECT_LABELS[subject] ?? subject;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0a0a 0%, #171717 50%, #0a0a0a 100%)",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Glow effect */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "600px",
            height: "300px",
            borderRadius: "50%",
            background: stats.tierGlow,
            filter: "blur(80px)",
          }}
        />

        {/* Card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "60px",
            position: "relative",
          }}
        >
          {/* Tier badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "24px",
              padding: "6px 16px",
              borderRadius: "20px",
              border: `1px solid ${stats.tierColor}40`,
              backgroundColor: `${stats.tierColor}15`,
            }}
          >
            <span
              style={{
                fontSize: "14px",
                fontWeight: 800,
                letterSpacing: "2px",
                textTransform: "uppercase" as any,
                color: stats.tierColor,
              }}
            >
              {stats.tier}
            </span>
          </div>

          {/* Avatar */}
          {stats.avatarUrl ? (
            <img
              src={stats.avatarUrl}
              width={100}
              height={100}
              style={{
                width: "100px",
                height: "100px",
                borderRadius: "50%",
                objectFit: "cover",
                border: `3px solid ${stats.tierColor}50`,
                marginBottom: "16px",
              }}
            />
          ) : (
            <div
              style={{
                width: "100px",
                height: "100px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "40px",
                fontWeight: 700,
                color: stats.tierColor,
                backgroundColor: `${stats.tierColor}20`,
                border: `3px solid ${stats.tierColor}50`,
                marginBottom: "16px",
              }}
            >
              {stats.userName[0]?.toUpperCase() ?? "?"}
            </div>
          )}

          {/* Name */}
          <h1
            style={{
              fontSize: "42px",
              fontWeight: 800,
              color: "#f5f5f5",
              margin: "0 0 4px 0",
            }}
          >
            {stats.userName}
          </h1>

          <p
            style={{
              fontSize: "18px",
              color: stats.tierColor,
              margin: "0 0 32px 0",
            }}
          >
            {label} Governor
          </p>

          {/* Power score */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "12px",
              marginBottom: "32px",
            }}
          >
            <span
              style={{
                fontSize: "72px",
                fontWeight: 900,
                color: stats.tierColor,
                lineHeight: 1,
              }}
            >
              {stats.powerScore}
            </span>
            <span
              style={{
                fontSize: "16px",
                color: "#737373",
                textTransform: "uppercase" as any,
                letterSpacing: "2px",
              }}
            >
              Power
            </span>
          </div>

          {/* Stats row */}
          <div
            style={{
              display: "flex",
              gap: "24px",
            }}
          >
            {[
              { label: "Delegations", value: stats.delegationsReceived },
              { label: "Accreditations", value: stats.accreditationsReceived },
              { label: "Communities", value: stats.communitiesJoined },
              { label: "Proposals", value: stats.proposalsAuthored },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "12px 20px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(38,38,38,0.8)",
                  border: "1px solid rgba(64,64,64,0.5)",
                }}
              >
                <span
                  style={{
                    fontSize: "28px",
                    fontWeight: 700,
                    color: "#e5e5e5",
                  }}
                >
                  {s.value}
                </span>
                <span
                  style={{ fontSize: "11px", color: "#737373" }}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div
            style={{
              position: "absolute",
              bottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "12px", color: "#525252" }}>
              gov.loopcmbntr.live
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
