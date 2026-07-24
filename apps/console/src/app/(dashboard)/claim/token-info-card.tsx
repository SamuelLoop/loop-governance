"use client";

import { useState } from "react";
import { Coins, Copy, ExternalLink, Check } from "lucide-react";

export function TokenInfoCard({
  contractAddress,
  chainId,
}: {
  contractAddress: string;
  chainId: number;
}) {
  const [copied, setCopied] = useState(false);
  const shortAddr =
    contractAddress.slice(0, 6) + "…" + contractAddress.slice(-4);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(contractAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked; user can still copy from the tooltip URL
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-primary/10 p-2">
          <Coins className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">About LOOP</p>
          <p className="mt-1 text-xs text-muted-foreground">
            LOOP is an ERC-20 utility token on{" "}
            <span className="font-medium text-foreground">Base L2</span> (chain{" "}
            {chainId}). Use any EVM wallet that supports Base — MetaMask,
            Coinbase Wallet, Rainbow, Trust, Ledger. When we mint, tokens
            appear at the address you provide below on chain{" "}
            {chainId}. Do not use an Ethereum mainnet address that is not
            derived from the same seed phrase on Base, or you will not see
            them.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">Contract:</span>
            <code className="rounded bg-muted/40 px-2 py-0.5 font-mono">
              {shortAddr}
            </code>
            <button
              onClick={copyAddress}
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" /> Copy address
                </>
              )}
            </button>
            <a
              href={`https://basescan.org/token/${contractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              View on Basescan <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            To see your tokens in-wallet after minting, most wallets need
            you to "Import token" and paste this contract address. Symbol is{" "}
            <span className="font-medium text-foreground">LOOP</span>, decimals{" "}
            <span className="font-medium text-foreground">18</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
