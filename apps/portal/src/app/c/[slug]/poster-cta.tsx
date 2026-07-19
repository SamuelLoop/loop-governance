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
          className="inline-flex w-full items-center justify-center rounded-lg bg-amber-500 px-8 py-3.5 text-sm font-semibold text-neutral-950 transition hover:bg-amber-400 sm:w-auto"
        >
          Yes, I will give you my vote
        </a>
        <a
          href={consoleUrl}
          className="inline-flex w-full items-center justify-center rounded-lg border border-neutral-700 px-8 py-3.5 text-sm font-medium text-neutral-300 transition hover:border-neutral-500 hover:text-neutral-100 sm:w-auto"
        >
          I want to find out more
        </a>
      </>
    );
  }

  return (
    <a
      href={joinUrl}
      className="inline-flex w-full items-center justify-center rounded-lg bg-amber-500 px-10 py-3.5 text-sm font-semibold text-neutral-950 transition hover:bg-amber-400 sm:w-auto"
    >
      Join this community
    </a>
  );
}
