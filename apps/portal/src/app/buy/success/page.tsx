import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Purchase Complete | Loop_cmbntr",
};

export default function SuccessPage() {
  return (
    <div className="mx-auto max-w-lg px-6 py-24 text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
        <svg
          className="h-10 w-10 text-emerald-400"
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
      <h1 className="mb-3 text-2xl font-bold text-neutral-50">
        Purchase complete
      </h1>
      <p className="mb-2 text-neutral-400">
        Your LOOP tokens have been recorded. You will receive them once you
        connect a wallet to your account.
      </p>
      <p className="mb-8 text-sm text-neutral-500">
        Check your email for a receipt from Stripe.
      </p>
      <div className="flex justify-center gap-4">
        <Link
          href="/buy"
          className="rounded-lg border border-neutral-700 px-5 py-2.5 text-sm text-neutral-300 transition hover:border-neutral-500"
        >
          Buy more
        </Link>
        <Link
          href="/"
          className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-amber-400"
        >
          Go to portal
        </Link>
      </div>
    </div>
  );
}
