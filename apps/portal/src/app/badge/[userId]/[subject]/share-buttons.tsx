"use client";

type Props = {
  url: string;
  userName: string;
  subject: string;
  tier: string;
  score: number;
};

export function ShareButtons({ url, userName, subject, tier, score }: Props) {
  const text = `I'm a ${tier} ${subject} Governor on Loop_cmbntr with a power score of ${score}. Join me in shaping the future of ${subject.toLowerCase()} governance.`;
  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(url);

  const links = [
    {
      name: "X",
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      bg: "bg-neutral-800 hover:bg-neutral-700",
    },
    {
      name: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      bg: "bg-[#0A66C2]/20 hover:bg-[#0A66C2]/30 text-[#0A66C2]",
    },
    {
      name: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      bg: "bg-[#1877F2]/20 hover:bg-[#1877F2]/30 text-[#1877F2]",
    },
    {
      name: "WhatsApp",
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      bg: "bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366]",
    },
  ];

  const copyToClipboard = () => {
    navigator.clipboard.writeText(url);
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {links.map((l) => (
        <a
          key={l.name}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center rounded-lg px-4 py-2 text-xs font-medium transition ${l.bg}`}
        >
          {l.name}
        </a>
      ))}
      <button
        onClick={copyToClipboard}
        className="inline-flex items-center rounded-lg bg-neutral-800 px-4 py-2 text-xs font-medium text-neutral-300 transition hover:bg-neutral-700"
      >
        Copy link
      </button>
    </div>
  );
}
