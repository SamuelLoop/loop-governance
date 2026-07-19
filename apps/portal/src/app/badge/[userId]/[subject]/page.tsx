import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPowerStats } from "./power";
import { ShareButtons } from "./share-buttons";

type Params = Promise<{ userId: string; subject: string }>;

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

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { userId, subject } = await params;
  const stats = await getPowerStats(userId, subject);
  if (!stats) return { title: "Not found" };

  const label = SUBJECT_LABELS[subject] ?? subject;
  const title = `${stats.userName} | ${stats.tier} ${label} Governor`;
  const description = `${stats.powerScore} power score in ${label}. ${stats.delegationsReceived} delegations, ${stats.accreditationsReceived} accreditations, ${stats.communitiesJoined} communities.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: "Loop_cmbntr",
      images: [
        {
          url: `/badge/${userId}/${subject}/og`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/badge/${userId}/${subject}/og`],
    },
  };
}

export default async function BadgePage({ params }: { params: Params }) {
  const { userId, subject } = await params;
  const stats = await getPowerStats(userId, subject);
  if (!stats) notFound();

  const label = SUBJECT_LABELS[subject] ?? subject;
  const badgeUrl = `https://gov.loopcmbntr.live/badge/${userId}/${subject}`;

  const statItems = [
    { label: "Delegations", value: stats.delegationsReceived, icon: "shield" },
    { label: "Accreditations", value: stats.accreditationsReceived, icon: "star" },
    { label: "Votes cast", value: stats.votesCast, icon: "check" },
    { label: "Proposals", value: stats.proposalsAuthored, icon: "file" },
    { label: "Communities", value: stats.communitiesJoined, icon: "users" },
    {
      label: "Earned",
      value: `${stats.totalEarnings.toLocaleString(undefined, { maximumFractionDigits: 0 })} LOOP`,
      icon: "coins",
    },
  ];

  return (
    <div className="flex min-h-[calc(100vh-60px)] flex-col items-center px-4 py-12">
      {/* Platform intro */}
      <div className="mb-8 max-w-lg text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-amber-400">
          Global Governance Community
        </p>
        <h2 className="mt-2 text-lg font-semibold text-neutral-200">
          I care about {label}. My {label} power is growing.
        </h2>
        <p className="mt-2 text-sm text-neutral-500">
          Are you tired of poor governance decisions affecting your life?
          Make a difference. Join the community and bring your knowledge and
          wisdom to the table.
        </p>
      </div>

      {/* Badge card */}
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-neutral-800"
        style={{
          background: `linear-gradient(135deg, rgba(23,23,23,1) 0%, rgba(30,30,30,1) 50%, rgba(23,23,23,1) 100%)`,
          boxShadow: `0 0 80px ${stats.tierGlow}, 0 0 30px ${stats.tierGlow}`,
        }}
      >
        {/* Tier glow accent */}
        <div
          className="absolute -top-20 left-1/2 h-40 w-80 -translate-x-1/2 rounded-full blur-3xl"
          style={{ backgroundColor: stats.tierGlow }}
        />

        <div className="relative px-8 pb-8 pt-10">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt="Loop_cmbntr"
                className="h-6 w-6 rounded"
              />
              <span className="text-xs font-medium text-neutral-500">
                Loop<span className="text-neutral-600">_</span>
                <span className="text-red-500/70">cmbntr</span>
              </span>
            </div>
            <span
              className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
              style={{
                color: stats.tierColor,
                border: `1px solid ${stats.tierColor}40`,
                backgroundColor: `${stats.tierColor}10`,
              }}
            >
              {stats.tier}
            </span>
          </div>

          {/* User */}
          <div className="mb-6 flex items-center gap-4">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold"
              style={{
                backgroundColor: `${stats.tierColor}15`,
                color: stats.tierColor,
                border: `2px solid ${stats.tierColor}40`,
              }}
            >
              {stats.avatarUrl ? (
                <img
                  src={stats.avatarUrl}
                  alt={stats.userName}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                stats.userName[0]?.toUpperCase()
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-100">
                {stats.userName}
              </h1>
              {stats.location && (
                <p className="text-xs text-neutral-500">{stats.location}</p>
              )}
              <p
                className="mt-0.5 text-xs font-medium"
                style={{ color: stats.tierColor }}
              >
                {label} Governor
              </p>
            </div>
          </div>

          {/* Power score */}
          <div className="mb-8 text-center">
            <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-500">
              Power score
            </p>
            <p
              className="mt-1 text-5xl font-black tabular-nums tracking-tight"
              style={{ color: stats.tierColor }}
            >
              {stats.powerScore}
            </p>
            <div className="mx-auto mt-3 h-1.5 w-48 overflow-hidden rounded-full bg-neutral-800">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (stats.powerScore / 500) * 100)}%`,
                  backgroundColor: stats.tierColor,
                  boxShadow: `0 0 8px ${stats.tierColor}`,
                }}
              />
            </div>
            <div className="mx-auto mt-1.5 flex w-48 justify-between text-[9px] text-neutral-600">
              <span>Bronze</span>
              <span>Silver</span>
              <span>Gold</span>
              <span>Plat</span>
              <span>Diamond</span>
            </div>
          </div>

          {/* Motivational message */}
          <div className="mb-6 rounded-lg border border-neutral-800 bg-neutral-900/50 p-3 text-center">
            <p className="text-xs text-neutral-400">
              I am helping build better {label} governance.
              Every vote, proposal, and delegation strengthens the community.
            </p>
            <p className="mt-1 text-xs font-medium text-amber-400">
              Make your voice matter. Join me.
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3">
            {statItems.map((s) => (
              <div
                key={s.label}
                className="rounded-lg border border-neutral-800/80 bg-neutral-900/50 px-3 py-2.5 text-center"
              >
                <p className="text-lg font-bold tabular-nums text-neutral-200">
                  {s.value}
                </p>
                <p className="text-[10px] text-neutral-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Share section */}
      <div className="mt-8 text-center">
        <p className="mb-3 text-sm text-neutral-400">Share your badge</p>
        <ShareButtons url={badgeUrl} userName={stats.userName} subject={label} tier={stats.tier} score={stats.powerScore} />
      </div>

      {/* CTA to join */}
      <div className="mt-8 max-w-md text-center">
        <p className="mb-3 text-sm text-neutral-400">
          Come and join the new Global Governance Community
        </p>
        <a
          href={`/#${subject}`}
          className="inline-block rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-amber-400"
        >
          Explore {label} governance
        </a>
      </div>
    </div>
  );
}
