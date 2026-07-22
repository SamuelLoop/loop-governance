"use client";

import { useState, useCallback, useEffect } from "react";
import { createWalletClient, createPublicClient, custom, http, parseEther, encodeFunctionData } from "viem";
import { base } from "viem/chains";
import { LOOP_TOKEN_ADDRESS, LOOP_TOKEN_ABI, BASE_CHAIN_ID } from "./web3-config";
import { createBrowserClient } from "@supabase/ssr";

type Currency = "usd" | "gbp" | "eur";

const PRICES: Record<Currency, number> = { usd: 1.0, gbp: 0.8, eur: 0.9 };
const SYMBOLS: Record<Currency, string> = { usd: "$", gbp: "£", eur: "€" };
const LABELS: Record<Currency, string> = { usd: "USD", gbp: "GBP", eur: "EUR" };

const PRICE_PER_TOKEN_ETH = 0.0004;

function getEthereum(): any | null {
  if (typeof window === "undefined") return null;
  return (window as any).ethereum ?? null;
}

export function BuyForm() {
  const [amount, setAmount] = useState(50);
  const [currency, setCurrency] = useState<Currency>("usd");
  const [step, setStep] = useState<"select" | "method" | "wallet" | "crypto-confirm" | "crypto-success">("select");
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<"idle" | "signing" | "confirming" | "done">("idle");

  const totalCost = amount * PRICES[currency];
  const symbol = SYMBOLS[currency];
  const impactTokens = amount / 2;
  const allocationTokens = amount / 2;
  const totalMinted = amount + impactTokens + allocationTokens;
  const ethCost = amount * PRICE_PER_TOKEN_ETH;

  const presets = [2, 10, 50, 100, 1000, 5000, 10000];

  async function handleCardPayment() {
    setLoading(true);
    try {
      // Get access token if logged in
      let accessToken: string | undefined;
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: { session } } = await supabase.auth.getSession();
        if (session) accessToken = session.access_token;
      } catch {}

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, currency, accessToken }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoading(false);
    }
  }

  const connectWallet = useCallback(async () => {
    const ethereum = getEthereum();
    if (!ethereum) {
      setTxError("No wallet detected. Install MetaMask or use a Web3 browser.");
      return;
    }
    try {
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      setWalletAddress(accounts[0]);
      setTxError(null);

      const chainId = await ethereum.request({ method: "eth_chainId" });
      if (Number(chainId) !== BASE_CHAIN_ID) {
        try {
          await ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${BASE_CHAIN_ID.toString(16)}` }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await ethereum.request({
              method: "wallet_addEthereumChain",
              params: [{
                chainId: `0x${BASE_CHAIN_ID.toString(16)}`,
                chainName: "Base",
                nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                rpcUrls: ["https://mainnet.base.org"],
                blockExplorerUrls: ["https://basescan.org"],
              }],
            });
          }
        }
      }
    } catch (e) {
      setTxError(e instanceof Error ? e.message : "Failed to connect wallet");
    }
  }, []);

  async function handleCryptoPurchase() {
    const ethereum = getEthereum();
    if (!ethereum || !walletAddress) return;

    setTxError(null);
    setTxStatus("signing");
    setStep("crypto-confirm");

    try {
      const walletClient = createWalletClient({
        chain: base,
        transport: custom(ethereum),
      });

      const hash = await walletClient.writeContract({
        address: LOOP_TOKEN_ADDRESS,
        abi: LOOP_TOKEN_ABI,
        functionName: "purchase",
        args: [BigInt(amount)],
        value: parseEther(ethCost.toFixed(18)),
        account: walletAddress as `0x${string}`,
      });

      setTxHash(hash);
      setTxStatus("confirming");

      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      });

      await publicClient.waitForTransactionReceipt({ hash });

      // Record crypto purchase
      try {
        let accessToken: string | undefined;
        try {
          const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );
          const { data: { session } } = await supabase.auth.getSession();
          if (session) accessToken = session.access_token;
        } catch {}

        await fetch("/api/purchases/record-crypto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount,
            walletAddress,
            txHash: hash,
            ethPaid: ethCost.toFixed(18),
            accessToken,
          }),
        });
      } catch {}

      setTxStatus("done");
      setStep("crypto-success");
    } catch (e: any) {
      setTxError(e?.shortMessage ?? e?.message ?? "Transaction failed");
      setTxStatus("idle");
      setStep("wallet");
    }
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
      {step === "select" && (
        <>
          <h3 className="mb-4 text-sm font-medium text-neutral-300">
            How many LOOP tokens?
          </h3>

          <div className="mb-4 flex gap-2">
            {(Object.keys(PRICES) as Currency[]).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                  currency === c
                    ? "border-amber-500 bg-amber-500/10 text-amber-400"
                    : "border-neutral-700 text-neutral-400 hover:border-neutral-500"
                }`}
              >
                {SYMBOLS[c]} {LABELS[c]}
              </button>
            ))}
          </div>

          <div className="mb-4 grid grid-cols-4 gap-2 sm:grid-cols-7">
            {presets.map((p) => (
              <button
                key={p}
                onClick={() => setAmount(p)}
                className={`rounded-lg border px-3 py-3 text-center text-sm font-medium transition ${
                  amount === p
                    ? "border-amber-500 bg-amber-500/10 text-amber-400"
                    : "border-neutral-700 text-neutral-400 hover:border-neutral-500"
                }`}
              >
                {p >= 1000 ? `${(p / 1000).toFixed(0)}k` : p}
              </button>
            ))}
          </div>

          <div className="mb-6">
            <label className="mb-1 block text-xs text-neutral-500">
              Custom amount (must be even)
            </label>
            <input
              type="number"
              min={2}
              step={2}
              value={amount}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                if (v >= 2 && v % 2 === 0) setAmount(v);
              }}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-sm text-neutral-100 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="mb-6 space-y-2 rounded-lg border border-neutral-800 bg-neutral-950/50 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-400">You pay</span>
              <span className="font-medium text-neutral-100">
                {symbol}{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {LABELS[currency]}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">You receive</span>
              <span className="text-amber-400">{amount.toLocaleString()} LOOP</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Impact treasury gets</span>
              <span className="text-green-400">{impactTokens.toLocaleString()} LOOP</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Governance rewards</span>
              <span className="text-blue-400">{allocationTokens.toLocaleString()} LOOP</span>
            </div>
            <hr className="border-neutral-800" />
            <div className="flex justify-between font-medium">
              <span className="text-neutral-300">Total minted</span>
              <span className="text-neutral-100">{totalMinted.toLocaleString()} LOOP</span>
            </div>
          </div>

          <button
            onClick={() => setStep("method")}
            className="w-full rounded-lg bg-amber-500 px-6 py-3.5 text-sm font-semibold text-neutral-950 transition hover:bg-amber-400"
          >
            Buy {amount.toLocaleString()} LOOP for {symbol}{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </button>
        </>
      )}

      {step === "method" && (
        <div>
          <h3 className="mb-2 text-center text-lg font-semibold text-neutral-100">
            How would you like to pay?
          </h3>
          <p className="mb-6 text-center text-sm text-neutral-400">
            {amount.toLocaleString()} LOOP for {symbol}{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>

          <div className="space-y-3">
            <button
              onClick={handleCardPayment}
              disabled={loading}
              className="flex w-full items-center gap-4 rounded-lg border border-neutral-700 bg-neutral-950/50 px-5 py-4 text-left transition hover:border-emerald-500/50 hover:bg-emerald-500/5 disabled:opacity-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-100">
                  {loading ? "Redirecting to checkout..." : "Pay with card"}
                </p>
                <p className="text-xs text-neutral-500">
                  Visa, Mastercard, Amex. Secure checkout via Stripe.
                </p>
              </div>
              <div className="ml-auto flex gap-1.5">
                <div className="flex h-6 w-9 items-center justify-center rounded bg-[#1A1F71] text-[8px] font-bold text-white">VISA</div>
                <div className="flex h-6 w-9 items-center justify-center rounded bg-[#EB001B] text-[8px] font-bold text-white">MC</div>
                <div className="flex h-6 w-9 items-center justify-center rounded bg-[#006FCF] text-[8px] font-bold text-white">AMEX</div>
              </div>
            </button>

            <button
              onClick={() => {
                setStep("wallet");
                if (!walletAddress) connectWallet();
              }}
              className="flex w-full items-center gap-4 rounded-lg border border-neutral-700 bg-neutral-950/50 px-5 py-4 text-left transition hover:border-blue-500/50 hover:bg-blue-500/5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-100">
                  Pay with crypto
                </p>
                <p className="text-xs text-neutral-500">
                  {ethCost.toFixed(4)} ETH on Base L2
                </p>
              </div>
            </button>
          </div>

          <button
            onClick={() => setStep("select")}
            className="mt-4 block w-full text-center text-xs text-neutral-500 hover:text-neutral-300"
          >
            Back
          </button>
        </div>
      )}

      {step === "wallet" && (
        <div className="text-center">
          <h3 className="mb-2 text-lg font-semibold text-neutral-100">
            {walletAddress ? "Wallet connected" : "Connect your wallet"}
          </h3>

          {!walletAddress ? (
            <>
              <p className="mb-6 text-sm text-neutral-400">
                Connect MetaMask, Coinbase Wallet, or any Web3 wallet to purchase {amount.toLocaleString()} LOOP for {ethCost.toFixed(4)} ETH on Base L2.
              </p>
              {txError && <p className="mb-4 text-xs text-red-400">{txError}</p>}
              <button
                onClick={connectWallet}
                className="w-full rounded-lg bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                Connect Wallet
              </button>
            </>
          ) : (
            <>
              <p className="mb-1 text-sm text-neutral-400">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </p>
              <button
                onClick={() => { setWalletAddress(null); setTxError(null); }}
                className="mb-4 text-xs text-neutral-500 underline hover:text-neutral-300"
              >
                Disconnect
              </button>

              <div className="mb-4 space-y-2 rounded-lg border border-neutral-800 bg-neutral-950/50 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-400">You pay</span>
                  <span className="font-medium text-neutral-100">{ethCost.toFixed(4)} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">You receive</span>
                  <span className="text-amber-400">{amount.toLocaleString()} LOOP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Impact treasury</span>
                  <span className="text-green-400">{impactTokens.toLocaleString()} LOOP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Governance rewards</span>
                  <span className="text-blue-400">{allocationTokens.toLocaleString()} LOOP</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-500">Network</span>
                  <span className="text-neutral-400">Base L2</span>
                </div>
              </div>

              {txError && <p className="mb-3 text-xs text-red-400">{txError}</p>}

              <button
                onClick={handleCryptoPurchase}
                className="w-full rounded-lg bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                Purchase {amount.toLocaleString()} LOOP
              </button>
            </>
          )}

          <button
            onClick={() => setStep("method")}
            className="mt-4 block text-xs text-neutral-500 hover:text-neutral-300"
          >
            Back
          </button>
        </div>
      )}

      {step === "crypto-confirm" && (
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10">
            <svg className="h-8 w-8 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-neutral-100">
            {txStatus === "signing" && "Confirm in your wallet"}
            {txStatus === "confirming" && "Transaction confirming..."}
          </h3>
          <p className="text-sm text-neutral-400">
            {txStatus === "signing" && "Please approve the transaction in your wallet."}
            {txStatus === "confirming" && "Waiting for Base network confirmation."}
          </p>
          {txHash && (
            <a
              href={`https://basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-xs text-blue-400 underline hover:text-blue-300"
            >
              View on Basescan
            </a>
          )}
        </div>
      )}

      {step === "crypto-success" && (
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <svg className="h-8 w-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-neutral-100">Purchase complete</h3>
          <p className="mb-2 text-sm text-neutral-400">
            {amount.toLocaleString()} LOOP tokens minted to your wallet.
          </p>
          <p className="mb-4 text-sm text-neutral-500">
            {impactTokens.toLocaleString()} LOOP to impact treasury. {allocationTokens.toLocaleString()} LOOP to governance rewards.
          </p>
          {txHash && (
            <a
              href={`https://basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-4 inline-block text-sm text-blue-400 underline hover:text-blue-300"
            >
              View transaction on Basescan
            </a>
          )}
          <div className="mt-4">
            <button
              onClick={() => { setStep("select"); setTxHash(null); setTxError(null); setTxStatus("idle"); }}
              className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-amber-400"
            >
              Buy more LOOP
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
