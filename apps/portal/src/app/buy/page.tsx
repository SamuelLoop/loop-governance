import type { Metadata } from "next";
import { BuyForm } from "./buy-form";
import { Glass } from "@loop/ui";

export const metadata: Metadata = {
  title: "Buy LOOP Utility Tokens | Loop_cmbntr",
  description:
    "Purchase LOOP utility tokens to participate in governance, vote on proposals, and fund communities. Utility token with future 1:1 swap to regulated stablecoin.",
};

export default function BuyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-10 text-center">
        <span className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          LOOP Utility Token
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
          Buy into Loop
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-text-secondary">
          Purchase LOOP utility tokens to participate in governance, vote on
          proposals, earn rewards, and fund the communities you believe in.
        </p>
      </div>

      {/* Utility token notice */}
      <div className="mb-8 rounded-lg border border-warning/20 bg-warning/5 p-4 text-xs text-warning/90">
        <p className="mb-2 font-semibold text-warning">
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
      <Glass className="mb-10 p-6">
        <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-wider text-text-secondary">
          How it works
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-surface-border bg-background/50 p-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
              2
            </div>
            <p className="text-sm font-medium text-text-primary">
              You receive
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              2 LOOP tokens go to your wallet. Use them for governance voting,
              delegation, and platform services.
            </p>
          </div>
          <div className="rounded-lg border border-surface-border bg-background/50 p-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-success/10 text-lg font-bold text-success">
              1
            </div>
            <p className="text-sm font-medium text-text-primary">
              Impact treasury
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              1 LOOP is minted into the impact treasury, funding governance
              rewards for active community members.
            </p>
          </div>
          <div className="rounded-lg border border-surface-border bg-background/50 p-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
              1
            </div>
            <p className="text-sm font-medium text-text-primary">
              Your allocation
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              1 LOOP goes to your allocation pot. Direct it to a community of
              your choice or exchange it for advertising credits.
            </p>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-text-secondary">
          For every 2 LOOP purchased, 4 LOOP enter the ecosystem. Your purchase
          has double the impact.
        </p>
      </Glass>

      {/* Buy form */}
      <BuyForm />

      {/* Footer */}
      <div className="mt-10 space-y-2 text-center text-xs text-text-muted">
        <p>LOOP is an ERC-20 utility token on Base L2 (Coinbase).</p>
        <p>Connect MetaMask, Coinbase Wallet, or any Web3 wallet.</p>
        <p>
          Contract secured by Ledger hardware wallet. Verified on{" "}
          <a
            href="https://basescan.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-secondary underline hover:text-text-primary"
          >
            Basescan
          </a>
          .
        </p>
      </div>

      {/* Legal disclaimer */}
      <div className="mt-8 border-t border-surface-border pt-6 text-[10px] leading-relaxed text-text-muted">
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
