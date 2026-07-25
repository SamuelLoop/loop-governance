import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DEMO_TIERS, generateTreeSVG, type TierSlug } from "@/lib/power-tree";
import { ShareButtons } from "../../../[userId]/[subject]/share-buttons";

type Params = Promise<{ tier: string; subject: string }>;

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
  const { tier, subject } = await params;
  const demo = DEMO_TIERS[tier as TierSlug];
  if (!demo) return { title: "Not found" };
  const label = SUBJECT_LABELS[subject] ?? subject;
  const title = `${demo.tier} ${label} Governor | Demo Badge`;
  const description = `${demo.powerScore} power score · ${demo.delegators} delegations · ${demo.networkTotal} in network`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: "Loop_cmbntr",
      images: [{ url: `/badge/demo/${tier}/${subject}/og`, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/badge/demo/${tier}/${subject}/og`],
    },
  };
}

export default async function DemoBadgePage({ params }: { params: Params }) {
  const { tier, subject } = await params;
  const demo = DEMO_TIERS[tier as TierSlug];
  if (!demo) notFound();

  const label = SUBJECT_LABELS[subject] ?? subject;
  const badgeUrl = `https://gov.loopcmbntr.live/badge/demo/${tier}/${subject}`;

  const treeSvg = generateTreeSVG({
    tree: demo.tree,
    tierColor: demo.tierColor,
    powerScore: demo.powerScore,
    tier: demo.tier,
    userName: "Demo Governor",
    subject: label,
    delegators: demo.delegators,
    networkTotal: demo.networkTotal,
    votes: demo.votes,
    proposals: demo.proposals,
    communities: demo.communities,
    mode: "badge",
  });

  return (
    <div className="flex min-h-[calc(100vh-60px)] flex-col items-center px-4 py-12">
      {/* Demo banner */}
      <div className="mb-6 max-w-lg w-full rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-center">
        <p className="text-xs text-amber-400/80">
          Demo badge — {demo.tier} tier · Share to see how it renders on WhatsApp
        </p>
      </div>

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
        style={{ boxShadow: `0 0 80px ${demo.tierGlow}, 0 0 30px ${demo.tierGlow}` }}
        dangerouslySetInnerHTML={{ __html: treeSvg.replace("<svg ", '<svg style="width:100%;height:auto" ') }}
      />

      {/* Share section */}
      <div className="mt-8 text-center">
        <p className="mb-3 text-sm text-neutral-400">Share this demo badge</p>
        <ShareButtons
          url={badgeUrl}
          userName="Demo Governor"
          subject={label}
          tier={demo.tier}
          score={demo.powerScore}
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
