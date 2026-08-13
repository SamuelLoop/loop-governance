"use client";

import { useActionState, useState, useCallback } from "react";
import {
  claimAndMint,
  claimAllAndMint,
  type Purchase,
  type AllocationSlice,
  type CommunityOption,
} from "./actions";
import { AllocationSection } from "./allocation-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Package,
  CheckCircle,
  Clock,
  Wallet,
  CreditCard,
  Coins,
  ExternalLink,
  PartyPopper,
} from "lucide-react";
import { Glass, StatusChip, type StatusChipVariant } from "@loop/ui";

function getEthereum(): any | null {
  if (typeof window === "undefined") return null;
  return (window as any).ethereum ?? null;
}

// Claim lifecycle is a real 3-state progression (connect wallet → awaiting
// mint → on-chain), so it fits StatusChip's semantic palette cleanly:
// on-chain/minted is the good end state, awaiting mint is "pending,
// nothing wrong", connect-wallet is a neutral first step, not a warning.
const STATUS_VARIANT: Record<"onchain" | "minted" | "awaiting" | "connect", StatusChipVariant> = {
  onchain: "success",
  minted: "success",
  awaiting: "warning",
  connect: "neutral",
};

function StatusBadge({ purchase }: { purchase: Purchase }) {
  const isCrypto = purchase.stripe_payment_intent_id?.startsWith("crypto:");
  if (isCrypto) {
    return (
      <StatusChip variant={STATUS_VARIANT.onchain} className="normal-case">
        <CheckCircle className="mr-1 h-3 w-3" />
        On-chain
      </StatusChip>
    );
  }
  if (purchase.minted_at) {
    return (
      <StatusChip variant={STATUS_VARIANT.minted} className="normal-case">
        <CheckCircle className="mr-1 h-3 w-3" />
        Minted
      </StatusChip>
    );
  }
  if (purchase.wallet_address) {
    return (
      <StatusChip variant={STATUS_VARIANT.awaiting} className="normal-case">
        <Clock className="mr-1 h-3 w-3" />
        Awaiting mint
      </StatusChip>
    );
  }
  return (
    <StatusChip variant={STATUS_VARIANT.connect} className="normal-case">
      <Package className="mr-1 h-3 w-3" />
      Connect wallet
    </StatusChip>
  );
}

function PaymentMethod({ purchase }: { purchase: Purchase }) {
  const isCrypto = purchase.stripe_payment_intent_id?.startsWith("crypto:");
  if (isCrypto) {
    return (
      <span className="flex items-center gap-1 text-[10px] text-text-secondary">
        <Coins className="h-3 w-3" />
        Crypto (ETH)
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[10px] text-text-secondary">
      <CreditCard className="h-3 w-3" />
      Card
    </span>
  );
}

function PurchaseRow({ purchase }: { purchase: Purchase }) {
  const [state, action] = useActionState(claimAndMint, { error: "", success: "" });
  const [wallet, setWallet] = useState("");
  const isCrypto = purchase.stripe_payment_intent_id?.startsWith("crypto:");
  const needsWallet = !isCrypto && !purchase.wallet_address && !purchase.minted_at;
  const txHash = isCrypto
    ? purchase.stripe_payment_intent_id?.replace("crypto:", "")
    : null;

  return (
    <Glass className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-mono text-data-lg font-semibold tabular-nums text-text-primary">
              {purchase.amount.toLocaleString()} LOOP
            </p>
            <StatusBadge purchase={purchase} />
          </div>
          <div className="mt-1.5 flex items-center gap-3">
            <PaymentMethod purchase={purchase} />
            <span className="text-[10px] text-text-secondary">
              {new Date(purchase.created_at).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
          {purchase.wallet_address && (
            <p className="mt-1 font-mono text-caption text-text-secondary">
              {purchase.wallet_address.slice(0, 6)}...
              {purchase.wallet_address.slice(-4)}
            </p>
          )}
          {txHash && (
            <a
              href={`https://basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              View on Basescan
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {purchase.minted_at && !isCrypto && (
            <p className="mt-1 text-xs text-success">
              Minted{" "}
              {new Date(purchase.minted_at).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          )}
        </div>
        <div className="text-right text-xs text-text-secondary">
          <p>{purchase.impact_amount} impact</p>
          <p>{purchase.allocation_amount} allocation</p>
          <p className="mt-1 font-medium text-text-primary">
            ${purchase.price_usd.toFixed(2)}
          </p>
        </div>
      </div>

      {needsWallet && (
        <form action={action} className="mt-3 flex gap-2">
          <input type="hidden" name="purchase_id" value={purchase.id} />
          <Input
            name="wallet_address"
            placeholder="0x... your Base wallet address"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            className="flex-1 font-mono text-xs"
          />
          <Button type="submit" size="sm">
            Claim
          </Button>
        </form>
      )}
      {state.error && (
        <p className="mt-2 text-xs text-error">{state.error}</p>
      )}
      {state.success && (
        <p className="mt-2 text-xs text-success">
          {state.success}
          {state.txHash && (
            <>
              {" "}
              <a
                href={`https://basescan.org/tx/${state.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:underline"
              >
                view tx <ExternalLink className="inline h-3 w-3" />
              </a>
            </>
          )}
        </p>
      )}
    </Glass>
  );
}

export function ClaimPanel({
  purchases,
  justPurchased,
  slices,
  communities,
}: {
  purchases: Purchase[];
  justPurchased?: boolean;
  slices: AllocationSlice[];
  communities: CommunityOption[];
}) {
  const [walletState, walletAction] = useActionState(claimAllAndMint, {
    error: "",
    success: "",
  });
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);

  const connectWallet = useCallback(async () => {
    const ethereum = getEthereum();
    if (!ethereum) return;
    try {
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });
      setConnectedWallet(accounts[0]);
    } catch {}
  }, []);

  const unclaimed = purchases.filter(
    (p) =>
      !p.wallet_address &&
      !p.minted_at &&
      !p.stripe_payment_intent_id?.startsWith("crypto:")
  );
  const awaiting = purchases.filter(
    (p) =>
      p.wallet_address &&
      !p.minted_at &&
      !p.stripe_payment_intent_id?.startsWith("crypto:")
  );
  const onChain = purchases.filter(
    (p) =>
      p.minted_at || p.stripe_payment_intent_id?.startsWith("crypto:")
  );

  const totalUnclaimed = unclaimed.reduce((sum, p) => sum + p.amount, 0);
  const totalAwaiting = awaiting.reduce((sum, p) => sum + p.amount, 0);
  const totalOnChain = onChain.reduce((sum, p) => sum + p.amount, 0);

  if (purchases.length === 0) {
    return (
      <Glass className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <Package className="mb-4 h-12 w-12 text-text-muted" />
        <h3 className="mb-2 text-h2 font-bold text-text-primary">No tokens yet</h3>
        <p className="mb-6 max-w-sm text-body text-text-secondary">
          Purchase LOOP tokens with card or crypto. Every purchase is recorded
          here so you always know exactly what you own.
        </p>
        <a href="https://gov.loopcmbntr.live/buy">
          <Button>Buy LOOP</Button>
        </a>
      </Glass>
    );
  }

  return (
    <div className="space-y-6">
      {/* Purchase success banner */}
      {justPurchased && (
        <div className="flex items-center gap-3 rounded-panel border border-success/20 bg-success/5 p-4">
          <PartyPopper className="h-5 w-5 shrink-0 text-success" />
          <div>
            <p className="text-sm font-medium text-success">
              Purchase complete, your tokens are secured
            </p>
            <p className="text-xs text-text-secondary">
              Your LOOP tokens are recorded and safe. Add a wallet address
              whenever you are ready, or leave them held for now.
            </p>
          </div>
        </div>
      )}

      {/* Total balance */}
      <Glass className="p-5">
        <p className="text-caption font-medium uppercase tracking-wide text-text-secondary">
          Total LOOP balance
        </p>
        <p className="mt-1 font-mono text-display font-bold tabular-nums text-text-primary">
          {(totalUnclaimed + totalAwaiting + totalOnChain).toLocaleString()} LOOP
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-md bg-surface px-3 py-2 text-center">
            <p className="font-mono text-body font-semibold tabular-nums text-text-primary">
              {totalUnclaimed.toLocaleString()}
            </p>
            <p className="text-[10px] text-text-secondary">Held securely</p>
          </div>
          <div className="rounded-md bg-warning/10 px-3 py-2 text-center">
            <p className="font-mono text-body font-semibold tabular-nums text-warning">
              {totalAwaiting.toLocaleString()}
            </p>
            <p className="text-[10px] text-warning/80">Being minted</p>
          </div>
          <div className="rounded-md bg-success/10 px-3 py-2 text-center">
            <p className="font-mono text-body font-semibold tabular-nums text-success">
              {totalOnChain.toLocaleString()}
            </p>
            <p className="text-[10px] text-success/80">On-chain</p>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-text-secondary">
          All purchased tokens are yours regardless of status. &quot;Held securely&quot; means
          we are holding them until you provide a wallet address. &quot;Being minted&quot; means
          your wallet is set and tokens will be sent to it shortly.
        </p>
      </Glass>

      {/* Bulk claim */}
      {unclaimed.length > 0 && (
        <Glass className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <p className="text-body font-medium text-text-primary">
              Ready to transfer {totalUnclaimed.toLocaleString()} LOOP to your wallet
            </p>
          </div>
          <p className="mb-3 text-caption text-text-secondary">
            Your tokens are safe with us. When you are ready, connect a Base L2
            wallet and we will mint them directly to your address. No rush.
          </p>

          {connectedWallet ? (
            <form action={walletAction} className="flex gap-2">
              <Input
                name="wallet_address"
                value={connectedWallet}
                readOnly
                className="flex-1 font-mono text-xs"
              />
              <Button type="submit" size="sm">
                Claim all
              </Button>
            </form>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={connectWallet}
                className="gap-1.5"
              >
                <Wallet className="h-3 w-3" />
                Connect wallet
              </Button>
              <span className="text-center text-xs text-text-secondary">
                or paste your address
              </span>
              <form action={walletAction} className="flex gap-2">
                <Input
                  name="wallet_address"
                  placeholder="0x..."
                  className="flex-1 font-mono text-xs"
                />
                <Button type="submit" size="sm">
                  Claim all
                </Button>
              </form>
            </div>
          )}
          {walletState.error && (
            <p className="mt-2 text-xs text-error">
              {walletState.error}
            </p>
          )}
          {walletState.success && (
            <p className="mt-2 text-xs text-success">{walletState.success}</p>
          )}
        </Glass>
      )}

      {/* Claim cash purchased Tokens */}
      <div>
        <h3 className="mb-3 text-caption font-medium text-text-secondary">
          Claim cash purchased Tokens ({purchases.length})
        </h3>
        <div className="space-y-3">
          {purchases.map((p) => (
            <PurchaseRow key={p.id} purchase={p} />
          ))}
        </div>
      </div>

      {/* Your allocation - direct to a community */}
      <AllocationSection slices={slices} communities={communities} />

      {/* Buy more */}
      <div className="text-center">
        <a href="https://gov.loopcmbntr.live/buy">
          <Button variant="outline" size="sm">
            Buy more LOOP
          </Button>
        </a>
      </div>
    </div>
  );
}
