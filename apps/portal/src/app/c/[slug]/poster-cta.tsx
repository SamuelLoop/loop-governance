"use client";

type Props = {
  campaignId: string;
  candidateId?: string;
  communityId: string;
  communitySlug: string;
  type: "campaign" | "flyer";
};

export function PosterCTA({
  campaignId,
  candidateId,
  communityId,
  communitySlug,
  type,
}: Props) {
  const joinUrl = `/join/${communitySlug}`;
  const consoleUrl = `https://console.loopcmbntr.live/communities/${communityId}`;

  if (type === "campaign") {
    return (
      <>
        <a
          href={joinUrl}
          className="inline-flex w-full items-center justify-center rounded-lg px-8 py-3.5 text-sm font-semibold text-white shadow-[var(--accent-glow)] transition-opacity hover:opacity-90 sm:w-auto"
          style={{ background: "var(--accent-gradient)" }}
        >
          Yes, I will give you my vote
        </a>
        <a
          href={consoleUrl}
          className="inline-flex w-full items-center justify-center rounded-lg border border-surface-border px-8 py-3.5 text-sm font-medium text-text-secondary transition-colors hover:border-text-secondary/50 hover:text-text-primary sm:w-auto"
        >
          I want to find out more
        </a>
      </>
    );
  }

  return (
    <a
      href={joinUrl}
      className="inline-flex w-full items-center justify-center rounded-lg px-10 py-3.5 text-sm font-semibold text-white shadow-[var(--accent-glow)] transition-opacity hover:opacity-90 sm:w-auto"
      style={{ background: "var(--accent-gradient)" }}
    >
      Join this community
    </a>
  );
}
