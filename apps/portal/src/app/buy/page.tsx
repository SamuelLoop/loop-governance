import type { Metadata } from "next";
import { BuyForm } from "./buy-form";

export const metadata: Metadata = {
  title: "Buy LOOP Utility Tokens | Loop_cmbntr",
  description:
    "Purchase LOOP utility tokens to participate in governance, vote on proposals, and fund communities. Utility token with future 1:1 swap to regulated stablecoin.",
};

export default function BuyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-10 text-center">
        <span className="mb-3 inline-block rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
          LOOP Utility Token
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-50 sm:text-4xl">
          Buy into Loop
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-neutral-400">
          Purchase LOOP utility tokens to participate in governance, vote on
          proposals, earn rewards, and fund the communities you believe in.
        </p>
      </div>

      {/* Utility token notice */}
      <div className="mb-8 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-200/80">
        <p className="mb-2 font-semibold text-amber-300">
          Utility token notice
        </p>
        <p>
          LOOP is a <strong>utility token</strong> that grants access to
          governance, voting, delegation, and community services on the
          Loop_cmbntr platform. It is not a security, not an investment
          contract, and confers no ownership, profit-sharing, or equity rights
          in any entity.
        </p>
        <p className="mt-2">
          A <strong>1:1 swap</strong> to a regulated stablecoin-backed token
          will be offered once the legal structures and fund(s) are
          established. Every LOOP holder will be able to exchange each utility
          token for one unit of the replacement token at no additional cost.
        </p>
      </div>

      {/* How it works */}
      <div className="mb-10 rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
        <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-wider text-neutral-400">
          How it works
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-lg font-bold text-amber-400">
              2
            </div>
            <p className="text-sm font-medium text-neutral-200">
              You receive
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              2 LOOP tokens go to your wallet. Use them for governance voting,
              delegation, and platform services.
            </p>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10 text-lg font-bold text-green-400">
              1
            </div>
            <p className="text-sm font-medium text-neutral-200">
              Impact treasury
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              1 LOOP is minted into the impact treasury, funding governance
              rewards for active community members.
            </p>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-lg font-bold text-blue-400">
              1
            </div>
            <p className="text-sm font-medium text-neutral-200">
              Your allocation
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              1 LOOP goes to your allocation pot. Direct it to a community of
              your choice or exchange it for advertising credits.
            </p>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-neutral-500">
          For every 2 LOOP purchased, 4 LOOP enter the ecosystem. Your purchase
          has double the impact.
        </p>
      </div>

      {/* Buy form */}
      <BuyForm />

      {/* Footer */}
      <div className="mt-10 space-y-2 text-center text-xs text-neutral-600">
        <p>LOOP is an ERC-20 utility token on Base L2 (Coinbase).</p>
        <p>Powered by Coinbase Smart Wallet. No browser extension needed.</p>
        <p>
          Contract secured by Ledger hardware wallet. Verified on{" "}
          <a
            href="https://basescan.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-500 underline hover:text-neutral-400"
          >
            Basescan
          </a>
          .
        </p>
      </div>

      {/* Legal disclaimer */}
      <div className="mt-8 border-t border-neutral-900 pt-6 text-[10px] leading-relaxed text-neutral-700">
        <p>
          LOOP is a utility token for use within the Loop_cmbntr governance
          platform. Purchasing LOOP does not constitute an investment in any
          company, fund, or legal entity. LOOP tokens do not represent equity,
          debt, revenue share, dividends, or any financial interest. The value
          of LOOP may fluctuate and there is no guarantee of future value. By
          purchasing, you acknowledge that LOOP is acquired solely for
          platform utility purposes. This offering is not registered under any
          securities laws and is not intended for jurisdictions where such
          tokens are prohibited. A future 1:1 token swap is planned but not
          guaranteed and is subject to regulatory approval.
        </p>
      </div>
    </div>
  );
}
