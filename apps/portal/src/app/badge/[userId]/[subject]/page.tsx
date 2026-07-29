import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { getPowerStats } from "./power";
import { fetchPowerTree, generateTreeSVG } from "@/lib/power-tree";
import { createServiceClient } from "@/lib/supabase-server";
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

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { userId, subject } = await params;
  const stats = await getPowerStats(userId, subject);
  if (!stats) return { title: "Not found" };

  const label = SUBJECT_LABELS[subject] ?? subject;
  const title = `${stats.userName} | ${stats.tier} ${label} Governor`;
  const displayScore = Number(stats.powerScore).toFixed(2);
  const description = `${displayScore} power score in ${label}. ${stats.delegationsReceived} delegations, ${stats.accreditationsReceived} accreditations, ${stats.communitiesJoined} communities.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: "Loop_cmbntr",
      images: [{ url: `/badge/${userId}/${subject}/og`, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/badge/${userId}/${subject}/og`],
    },
  };
}

export default async function BadgePage({ params }: { params: Params }): Promise<ReactElement> {
  const { userId, subject } = await params;
  const [stats, tree] = await Promise.all([
    getPowerStats(userId, subject),
    fetchPowerTree(userId, subject, createServiceClient()),
  ]);
  if (!stats) notFound();

  const label = SUBJECT_LABELS[subject] ?? subject;
  const badgeUrl = `https://gov.loopcmbntr.live/badge/${userId}/${subject}`;
  const networkTotal = tree.nodes.length;
  const delegators = tree.nodes.filter(n => n.depth === 1).length;

  const treeSvg = generateTreeSVG({
    tree,
    tierColor: stats.tierColor,
    powerScore: stats.powerScore,
    tier: stats.tier,
    userName: stats.userName,
    subject: label,
    delegators,
    networkTotal,
    votes: stats.votesCast,
    proposals: stats.proposalsAuthored,
    communities: stats.communitiesJoined,
    mode: "badge",
  });

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

      {/* Power Tree badge card */}
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl"
        style={{ boxShadow: `0 0 80px ${stats.tierGlow}, 0 0 30px ${stats.tierGlow}` }}
        dangerouslySetInnerHTML={{ __html: treeSvg.replace("<svg ", '<svg style="width:100%;height:auto" ') }}
      />

      {/* Share section */}
      <div className="mt-8 text-center">
        <p className="mb-3 text-sm text-neutral-400">Share your badge</p>
        <ShareButtons
          url={badgeUrl}
          userName={stats.userName}
          subject={label}
          tier={stats.tier}
          score={stats.powerScore}
        />
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
