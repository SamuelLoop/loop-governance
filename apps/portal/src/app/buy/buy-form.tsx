"use client";

import { useState } from "react";

const PRICE_USD = 1.0;

export function BuyForm() {
  const [amount, setAmount] = useState(10);
  const [step, setStep] = useState<"select" | "method" | "wallet" | "processing">("select");
  const [loading, setLoading] = useState(false);

  const totalCost = amount * PRICE_USD;
  const impactTokens = amount / 2;
  const allocationTokens = amount / 2;
  const totalMinted = amount + impactTokens + allocationTokens;

  const presets = [2, 10, 50, 100, 1000, 5000, 10000];

  async function handleCardPayment() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
      {step === "select" && (
        <>
          <h3 className="mb-4 text-sm font-medium text-neutral-300">
            How many LOOP tokens?
          </h3>

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
                ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
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
              <span className="text-neutral-400">Your allocation pot</span>
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
            Buy {amount.toLocaleString()} LOOP for ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </button>
        </>
      )}

      {step === "method" && (
        <div>
          <h3 className="mb-2 text-center text-lg font-semibold text-neutral-100">
            How would you like to pay?
          </h3>
          <p className="mb-6 text-center text-sm text-neutral-400">
            {amount.toLocaleString()} LOOP for ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              onClick={() => setStep("wallet")}
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
                  ETH on Base L2 via Coinbase Smart Wallet
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
            Connect your wallet
          </h3>
          <p className="mb-6 text-sm text-neutral-400">
            Use Coinbase Smart Wallet for the easiest experience. No browser
            extension needed, just sign in with email.
          </p>

          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-300">
            <p className="font-medium">Coming soon</p>
            <p className="mt-1 text-xs text-amber-400/70">
              Direct crypto purchases will be available once wallet integration
              is complete. Use card payment for now.
            </p>
          </div>

          <div className="mt-4 flex justify-center gap-4">
            <button
              onClick={() => setStep("method")}
              className="text-xs text-neutral-500 hover:text-neutral-300"
            >
              Back
            </button>
            <button
              onClick={() => {
                setStep("method");
                setTimeout(handleCardPayment, 100);
              }}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-emerald-500"
            >
              Pay with card instead
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
