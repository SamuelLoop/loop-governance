import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Purchase Complete | Loop_cmbntr",
};

export default function SuccessPage() {
  return (
    <div className="mx-auto max-w-lg px-6 py-24 text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
        <svg
          className="h-10 w-10 text-success"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h1 className="mb-3 text-2xl font-bold text-text-primary">
        Purchase complete
      </h1>
      <p className="mb-2 text-text-secondary">
        Your LOOP tokens have been recorded and are ready to claim.
      </p>
      <p className="mb-8 text-sm text-text-secondary">
        Head to the console to connect your wallet and receive your tokens on
        Base L2. Check your email for a receipt from Stripe.
      </p>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <a
          href="https://console.loopcmbntr.live/claim"
          className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--accent-glow)] transition-opacity hover:opacity-90"
          style={{ background: "var(--accent-gradient)" }}
        >
          Claim tokens
        </a>
        <Link
          href="/buy"
          className="rounded-lg border border-surface-border px-5 py-2.5 text-sm text-text-secondary transition-colors hover:border-text-secondary/50"
        >
          Buy more
        </Link>
        <Link
          href="/"
          className="rounded-lg border border-surface-border px-5 py-2.5 text-sm text-text-secondary transition-colors hover:border-text-secondary/50"
        >
          Go to portal
        </Link>
      </div>
    </div>
  );
}
