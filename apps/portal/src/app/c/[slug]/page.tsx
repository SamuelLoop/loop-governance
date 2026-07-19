import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase-server";
import type { Metadata } from "next";
import { PosterCTA } from "./poster-cta";

type Params = Promise<{ slug: string }>;

function renderTiptapNode(node: any, key: number): React.ReactNode {
  if (!node) return null;

  if (node.type === "text") {
    let el: React.ReactNode = node.text;
    for (const mark of node.marks ?? []) {
      if (mark.type === "bold") el = <strong key={key}>{el}</strong>;
      if (mark.type === "italic") el = <em key={key}>{el}</em>;
      if (mark.type === "underline")
        el = (
          <span key={key} className="underline">
            {el}
          </span>
        );
      if (mark.type === "link")
        el = (
          <a
            key={key}
            href={mark.attrs?.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 underline hover:text-amber-300"
          >
            {el}
          </a>
        );
    }
    return el;
  }

  const children = (node.content ?? []).map((child: any, i: number) =>
    renderTiptapNode(child, i)
  );
  const align = node.attrs?.textAlign;
  const alignClass = align === "center" ? "text-center" : align === "right" ? "text-right" : "";

  switch (node.type) {
    case "doc":
      return <>{children}</>;
    case "paragraph":
      return (
        <p key={key} className={`mb-4 text-neutral-300 ${alignClass}`}>
          {children}
        </p>
      );
    case "heading": {
      const level = node.attrs?.level ?? 2;
      if (level === 1)
        return (
          <h1
            key={key}
            className={`mb-3 text-3xl font-bold tracking-tight text-neutral-50 sm:text-4xl ${alignClass}`}
          >
            {children}
          </h1>
        );
      return (
        <h2
          key={key}
          className={`mb-3 mt-8 text-xl font-semibold text-neutral-100 ${alignClass}`}
        >
          {children}
        </h2>
      );
    }
    case "bulletList":
      return (
        <ul key={key} className="mb-4 list-disc space-y-2 pl-6 text-neutral-300">
          {children}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={key} className="mb-4 list-decimal space-y-2 pl-6 text-neutral-300">
          {children}
        </ol>
      );
    case "listItem":
      return <li key={key}>{children}</li>;
    case "blockquote":
      return (
        <blockquote
          key={key}
          className="mb-4 border-l-4 border-amber-500/50 pl-4 text-neutral-400 italic"
        >
          {children}
        </blockquote>
      );
    case "horizontalRule":
      return (
        <hr key={key} className="my-6 border-neutral-800" />
      );
    case "image":
      return (
        <img
          key={key}
          src={node.attrs?.src}
          alt={node.attrs?.alt ?? ""}
          className="my-4 w-full rounded-lg"
        />
      );
    case "youtube": {
      const src = node.attrs?.src;
      if (!src) return null;
      return (
        <div key={key} className="relative my-6 aspect-video overflow-hidden rounded-lg">
          <iframe
            src={src}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }
    default:
      return children.length > 0 ? <div key={key}>{children}</div> : null;
  }
}

function youtubeEmbedUrl(url: string): string {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/
  );
  return match ? `https://www.youtube.com/embed/${match[1]}` : url;
}

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
  const { slug } = await params;
  const admin = createServiceClient();
  const { data: campaign } = await admin
    .from("campaigns")
    .select(
      `headline, type, pitch,
      users!campaigns_user_id_fkey(display_name),
      communities!campaigns_community_id_fkey(name, subject, level)`
    )
    .eq("slug", slug)
    .eq("active", true)
    .single();

  if (!campaign) return { title: "Not found" };

  const c = campaign as any;
  const title =
    c.type === "campaign"
      ? `${c.headline} | ${c.communities?.name}`
      : `Join ${c.communities?.name}`;

  return {
    title,
    description: c.pitch,
    openGraph: {
      title,
      description: c.pitch,
      siteName: "Loop_cmbntr",
    },
  };
}

export default async function CampaignPosterPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const admin = createServiceClient();

  const { data: campaign } = await admin
    .from("campaigns")
    .select(
      `id, headline, type, pitch, content, youtube_url, photo_url, banner_url, created_at,
      users!campaigns_user_id_fkey(id, display_name, avatar_url, location_name),
      communities!campaigns_community_id_fkey(id, name, slug, subject, level)`
    )
    .eq("slug", slug)
    .eq("active", true)
    .single();

  if (!campaign) notFound();

  const c = campaign as any;
  const isCampaign = c.type === "campaign";
  const communitySlug = c.communities?.slug;
  const subjectLabel = SUBJECT_LABELS[c.communities?.subject] ?? c.communities?.subject;

  return (
    <div className="min-h-screen">
      {/* Platform intro banner */}
      <div className="border-b border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-neutral-950 to-amber-500/10 px-6 py-3 text-center">
        <p className="text-xs text-amber-300/90">
          <strong>Loop_cmbntr</strong> is the new Global Governance Community.
          Make your voice matter.{" "}
          <a href="/" className="underline hover:text-amber-200">
            Learn more
          </a>
        </p>
      </div>

      {/* Banner image */}
      {c.banner_url && (
        <div className="relative h-48 w-full overflow-hidden sm:h-64 md:h-80">
          <img
            src={c.banner_url}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/30 to-transparent" />
        </div>
      )}

      {/* Hero section */}
      <div className={`relative overflow-hidden border-b border-neutral-800/50 bg-gradient-to-b from-neutral-900 to-neutral-950 px-6 ${c.banner_url ? "py-8 sm:py-10 -mt-20 relative z-10" : "py-12 sm:py-16"}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.08),transparent_60%)]" />
        <div className="relative mx-auto max-w-2xl text-center">
          {/* What is this */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-900/80 px-4 py-2">
            <span className="text-xs text-neutral-400">
              {isCampaign
                ? `I care about ${subjectLabel}. I am helping build better governance.`
                : `We are building the future of ${subjectLabel} governance.`}
            </span>
          </div>

          {/* Candidate / Community header */}
          {isCampaign && c.users && (
            <div className="mb-6 flex flex-col items-center gap-3">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10 text-2xl font-bold text-amber-500 ring-2 ring-amber-500/30">
                {c.users.avatar_url ? (
                  <img
                    src={c.users.avatar_url}
                    alt={c.users.display_name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  c.users.display_name?.[0]?.toUpperCase()
                )}
              </div>
              <div>
                <p className="text-lg font-semibold text-neutral-100">
                  {c.users.display_name}
                </p>
                {c.users.location_name && (
                  <p className="text-xs text-neutral-500">
                    {c.users.location_name}
                  </p>
                )}
              </div>
            </div>
          )}

          <span className="mb-3 inline-block rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
            {subjectLabel} / {c.communities?.level}
          </span>

          <h1 className="text-3xl font-bold tracking-tight text-neutral-50 sm:text-5xl">
            {c.headline}
          </h1>

          <p className="mt-3 text-neutral-400">
            {c.communities?.name}
          </p>

          {/* Motivational tagline */}
          <div className="mx-auto mt-6 max-w-md rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
            <p className="text-sm font-medium text-neutral-200">
              {isCampaign
                ? `"Are you tired of poor governance decisions affecting your life? Join me and bring your knowledge and wisdom to the table."`
                : `"Are you tired of poor governance decisions affecting your life? Make a difference. Join the community and make your voice matter."`}
            </p>
            <p className="mt-2 text-xs text-amber-400">
              {isCampaign
                ? `My ${subjectLabel} governance power is growing. Join me.`
                : `Together, our ${subjectLabel} governance power grows.`}
            </p>
          </div>
        </div>
      </div>

      {/* YouTube video */}
      {c.youtube_url && (
        <div className="mx-auto max-w-3xl px-6 py-8">
          <div className="relative aspect-video overflow-hidden rounded-xl ring-1 ring-neutral-800">
            <iframe
              src={youtubeEmbedUrl(c.youtube_url)}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="mx-auto max-w-2xl px-6 py-8">
        <article>{c.content && renderTiptapNode(c.content, 0)}</article>
      </div>

      {/* What is Loop section */}
      <div className="border-t border-neutral-800/50 bg-neutral-900/30 px-6 py-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-3 text-lg font-semibold text-neutral-100">
            What is Loop_cmbntr?
          </h2>
          <p className="text-sm text-neutral-400">
            Loop_cmbntr is a global governance platform where real people govern real subjects: {subjectLabel}, Economics, Health, Technology, and more.
            Community members vote on proposals, elect leaders, earn rewards, and shape policy from local to global level.
            Your voice matters. Your knowledge matters. Your participation is rewarded.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs text-purple-400">Vote on proposals</span>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">Earn LOOP tokens</span>
            <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs text-blue-400">Build your power</span>
            <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-400">Shape governance</span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="sticky bottom-0 border-t border-neutral-800/50 bg-neutral-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 px-6 py-5 sm:flex-row sm:justify-center">
          {isCampaign ? (
            <PosterCTA
              campaignId={c.id}
              candidateId={c.users?.id}
              communityId={c.communities?.id}
              communitySlug={communitySlug}
              type="campaign"
            />
          ) : (
            <PosterCTA
              campaignId={c.id}
              communityId={c.communities?.id}
              communitySlug={communitySlug}
              type="flyer"
            />
          )}
        </div>
      </div>
    </div>
  );
}
