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
import { Badge } from "@/components/ui/badge";
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

function getEthereum(): any | null {
  if (typeof window === "undefined") return null;
  return (window as any).ethereum ?? null;
}

function StatusBadge({ purchase }: { purchase: Purchase }) {
  const isCrypto = purchase.stripe_payment_intent_id?.startsWith("crypto:");
  if (isCrypto) {
    return (
      <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
        <CheckCircle className="mr-1 h-3 w-3" />
        On-chain
      </Badge>
    );
  }
  if (purchase.minted_at) {
    return (
      <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
        <CheckCircle className="mr-1 h-3 w-3" />
        Minted
      </Badge>
    );
  }
  if (purchase.wallet_address) {
    return (
      <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-400">
        <Clock className="mr-1 h-3 w-3" />
        Awaiting mint
      </Badge>
    );
  }
  return (
    <Badge className="border-blue-500/20 bg-blue-500/10 text-blue-400">
      <Package className="mr-1 h-3 w-3" />
      Connect wallet
    </Badge>
  );
}

function PaymentMethod({ purchase }: { purchase: Purchase }) {
  const isCrypto = purchase.stripe_payment_intent_id?.startsWith("crypto:");
  if (isCrypto) {
    return (
      <span className="flex items-center gap-1 text-[10px] text-violet-400">
        <Coins className="h-3 w-3" />
        Crypto (ETH)
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[10px] text-sky-400">
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
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold tabular-nums">
              {purchase.amount.toLocaleString()} LOOP
            </p>
            <StatusBadge purchase={purchase} />
          </div>
          <div className="mt-1.5 flex items-center gap-3">
            <PaymentMethod purchase={purchase} />
            <span className="text-[10px] text-muted-foreground">
              {new Date(purchase.created_at).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
          {purchase.wallet_address && (
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {purchase.wallet_address.slice(0, 6)}...
              {purchase.wallet_address.slice(-4)}
            </p>
          )}
          {txHash && (
            <a
              href={`https://basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
            >
              View on Basescan
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {purchase.minted_at && !isCrypto && (
            <p className="mt-1 text-xs text-emerald-500">
              Minted{" "}
              {new Date(purchase.minted_at).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          )}
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>{purchase.impact_amount} impact</p>
          <p>{purchase.allocation_amount} allocation</p>
          <p className="mt-1 font-medium text-foreground">
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
        <p className="mt-2 text-xs text-destructive">{state.error}</p>
      )}
      {state.success && (
        <p className="mt-2 text-xs text-emerald-400">
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
    </div>
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
      <div className="flex flex-col items-center justify-center rounded-lg border bg-card px-6 py-16 text-center">
        <Package className="mb-4 h-12 w-12 text-muted-foreground/30" />
        <h3 className="mb-2 text-lg font-medium">No tokens yet</h3>
        <p className="mb-6 max-w-sm text-sm text-muted-foreground">
          Purchase LOOP tokens with card or crypto. Every purchase is recorded
          here so you always know exactly what you own.
        </p>
        <a href="https://gov.loopcmbntr.live/buy">
          <Button>Buy LOOP</Button>
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Purchase success banner */}
      {justPurchased && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
          <PartyPopper className="h-5 w-5 shrink-0 text-emerald-400" />
          <div>
            <p className="text-sm font-medium text-emerald-300">
              Purchase complete, your tokens are secured
            </p>
            <p className="text-xs text-muted-foreground">
              Your LOOP tokens are recorded and safe. Add a wallet address
              whenever you are ready, or leave them held for now.
            </p>
          </div>
        </div>
      )}

      {/* Total balance */}
      <div className="rounded-lg border bg-card p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Total LOOP balance
        </p>
        <p className="mt-1 text-3xl font-bold tabular-nums">
          {(totalUnclaimed + totalAwaiting + totalOnChain).toLocaleString()} LOOP
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-md bg-blue-500/10 px-3 py-2 text-center">
            <p className="text-lg font-semibold tabular-nums text-blue-400">
              {totalUnclaimed.toLocaleString()}
            </p>
            <p className="text-[10px] text-blue-400/70">Held securely</p>
          </div>
          <div className="rounded-md bg-amber-500/10 px-3 py-2 text-center">
            <p className="text-lg font-semibold tabular-nums text-amber-400">
              {totalAwaiting.toLocaleString()}
            </p>
            <p className="text-[10px] text-amber-400/70">Being minted</p>
          </div>
          <div className="rounded-md bg-emerald-500/10 px-3 py-2 text-center">
            <p className="text-lg font-semibold tabular-nums text-emerald-400">
              {totalOnChain.toLocaleString()}
            </p>
            <p className="text-[10px] text-emerald-400/70">On-chain</p>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          All purchased tokens are yours regardless of status. "Held securely" means
          we are holding them until you provide a wallet address. "Being minted" means
          your wallet is set and tokens will be sent to it shortly.
        </p>
      </div>

      {/* Bulk claim */}
      {unclaimed.length > 0 && (
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-blue-400" />
            <p className="text-sm font-medium">
              Ready to transfer {totalUnclaimed.toLocaleString()} LOOP to your wallet
            </p>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
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
              <span className="text-center text-xs text-muted-foreground">
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
            <p className="mt-2 text-xs text-destructive">
              {walletState.error}
            </p>
          )}
          {walletState.success && (
            <p className="mt-2 text-xs text-emerald-400">{walletState.success}</p>
          )}
        </div>
      )}

      {/* Claim cash purchased Tokens */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
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
