import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DEMO_TIERS, generateTreeSVG, type TierSlug } from "@/lib/power-tree";
import { ShareButtons } from "../../../[userId]/[subject]/share-buttons";
import { BadgeHero } from "@loop/ui";

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
      <div className="mb-6 max-w-lg w-full rounded-lg border border-warning/30 bg-warning/5 px-4 py-2 text-center">
        <p className="text-xs text-warning/90">
          Demo badge — {demo.tier} tier · Share to see how it renders on WhatsApp
        </p>
      </div>

      <BadgeHero
        eyebrow="Global Governance Community"
        heading={`I care about ${label}. My ${label} power is growing.`}
        description="Are you tired of poor governance decisions affecting your life? Make a difference. Join the community and bring your knowledge and wisdom to the table."
        treeSvgHtml={treeSvg.replace("<svg ", '<svg style="width:100%;height:auto" ')}
        glow={demo.tierGlow}
      />

      {/* Share section */}
      <div className="mt-8 text-center">
        <p className="mb-3 text-sm text-text-secondary">Share this demo badge</p>
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
        <p className="mb-3 text-sm text-text-secondary">
          Come and join the new Global Governance Community
        </p>
        <a
          href={`/#${subject}`}
          className="inline-block rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-[var(--accent-glow)] transition-opacity hover:opacity-90"
          style={{ background: "var(--accent-gradient)" }}
        >
          Explore {label} governance
        </a>
      </div>
    </div>
  );
}
