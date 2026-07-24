"use client";

import { useActionState, useState } from "react";
import { transferImpactTreasury, registerCommunityWallet } from "./impact-treasury-actions";

type Community = { id: string; name: string; level: string; subject: string };
type Recent = {
  id: string;
  recipient_wallet: string;
  recipient_label: string | null;
  amount: number;
  reason: string | null;
  tx_hash: string | null;
  created_at: string;
};

const inputCls =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function ImpactTreasuryCard({
  communities,
  recent,
  onChainBalance,
  treasuryAddress,
  chainConfigured,
}: {
  communities: Community[];
  recent: Recent[];
  onChainBalance: number | null;
  treasuryAddress: string | null;
  chainConfigured: boolean;
}) {
  const [transferState, transferAction] = useActionState(transferImpactTreasury, {
    error: "",
    success: "",
  });
  const [registerState, registerAction] = useActionState(registerCommunityWallet, {
    error: "",
    success: "",
  });
  const [communityId, setCommunityId] = useState(communities[0]?.id ?? "");

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h2 className="text-lg font-semibold">Impact Treasury (on-chain)</h2>
          <p className="text-sm text-muted-foreground">
            Move LOOP from the Impact Treasury to a community wallet or grantee,
            and register community wallets so buyers can direct their allocation.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">On-chain balance</p>
          <p className="text-2xl font-bold tabular-nums">
            {onChainBalance !== null ? onChainBalance.toLocaleString() : "—"}
            <span className="ml-1 text-xs font-normal text-muted-foreground">LOOP</span>
          </p>
          {treasuryAddress && (
            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
              {treasuryAddress.slice(0, 8)}…{treasuryAddress.slice(-6)}
            </p>
          )}
        </div>
      </div>

      {!chainConfigured && (
        <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
          NEXT_PUBLIC_LOOP_TOKEN_ADDRESS and LOOP_OWNER_PRIVATE_KEY are not set on this
          Vercel project. Add them to enable Impact Treasury actions.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-medium">Transfer from Impact Treasury</h3>
          {transferState.error && (
            <div className="mb-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-sm text-destructive">
              {transferState.error}
            </div>
          )}
          {transferState.success && (
            <div className="mb-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-sm text-green-400">
              {transferState.success}
              {transferState.txHash && (
                <a
                  href={`https://basescan.org/tx/${transferState.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 underline"
                >
                  view tx
                </a>
              )}
            </div>
          )}
          <form action={transferAction} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Recipient wallet</label>
              <input
                name="recipient"
                placeholder="0x…"
                required
                className={`${inputCls} font-mono`}
                disabled={!chainConfigured}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Amount (LOOP)</label>
                <input
                  name="amount"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="100"
                  required
                  className={inputCls}
                  disabled={!chainConfigured}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Label</label>
                <input
                  name="label"
                  placeholder="Grantee name / community"
                  className={inputCls}
                  disabled={!chainConfigured}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Reason (optional)</label>
              <input
                name="reason"
                placeholder="Why is this being sent"
                className={inputCls}
                disabled={!chainConfigured}
              />
            </div>
            <button
              type="submit"
              disabled={!chainConfigured}
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              Transfer
            </button>
          </form>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium">Register community wallet</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            A community must have an on-chain wallet before buyers can direct
            their allocation to it. This is a one-time registration.
          </p>
          {registerState.error && (
            <div className="mb-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-sm text-destructive">
              {registerState.error}
            </div>
          )}
          {registerState.success && (
            <div className="mb-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-sm text-green-400">
              {registerState.success}
              {registerState.txHash && (
                <a
                  href={`https://basescan.org/tx/${registerState.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 underline"
                >
                  view tx
                </a>
              )}
            </div>
          )}
          <form action={registerAction} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Community</label>
              <select
                name="community_id"
                value={communityId}
                onChange={(e) => setCommunityId(e.target.value)}
                required
                className={inputCls}
                disabled={!chainConfigured}
              >
                {communities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.subject} · {c.level})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Wallet address</label>
              <input
                name="wallet"
                placeholder="0x…"
                required
                className={`${inputCls} font-mono`}
                disabled={!chainConfigured}
              />
            </div>
            <button
              type="submit"
              disabled={!chainConfigured}
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              Register
            </button>
          </form>
        </div>
      </div>

      {recent.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-medium">Recent Impact Treasury transfers</h3>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">When</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Recipient</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Label</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Amount</th>
                  <th className="hidden px-3 py-2 text-left font-medium text-muted-foreground md:table-cell">Reason</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Tx</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {r.recipient_wallet.slice(0, 6)}…{r.recipient_wallet.slice(-4)}
                    </td>
                    <td className="px-3 py-2 text-xs">{r.recipient_label ?? "—"}</td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">
                      {Number(r.amount).toLocaleString()}
                    </td>
                    <td className="hidden px-3 py-2 text-xs text-muted-foreground md:table-cell">
                      {r.reason ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      {r.tx_hash && (
                        <a
                          href={`https://basescan.org/tx/${r.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary underline"
                        >
                          view
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
