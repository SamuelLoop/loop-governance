"use client";

import { useActionState, useState } from "react";
import { transferImpactTreasury, registerCommunityWallet } from "./impact-treasury-actions";
import {
  Glass,
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
} from "@loop/ui";

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
    <Glass space="admin" className="p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h2 className="text-h2 font-bold">Impact Treasury (on-chain)</h2>
          <p className="text-body text-text-secondary">
            Move LOOP from the Impact Treasury to a community wallet or grantee,
            and register community wallets so buyers can direct their allocation.
          </p>
        </div>
        <div className="text-right">
          <p className="text-caption text-text-secondary">On-chain balance</p>
          <p className="font-mono text-data-lg font-bold tabular-nums text-text-primary">
            {onChainBalance !== null ? onChainBalance.toLocaleString() : "—"}
            <span className="ml-1 text-xs font-normal text-text-secondary">LOOP</span>
          </p>
          {treasuryAddress && (
            <p className="mt-0.5 font-mono text-[10px] text-text-secondary">
              {treasuryAddress.slice(0, 8)}…{treasuryAddress.slice(-6)}
            </p>
          )}
        </div>
      </div>

      {!chainConfigured && (
        <div className="mb-4 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          NEXT_PUBLIC_LOOP_TOKEN_ADDRESS and LOOP_OWNER_PRIVATE_KEY are not set on this
          Vercel project. Add them to enable Impact Treasury actions.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-medium">Transfer from Impact Treasury</h3>
          {transferState.error && (
            <div className="mb-2 rounded-md border border-error/30 bg-error/10 px-3 py-1.5 text-sm text-error">
              {transferState.error}
            </div>
          )}
          {transferState.success && (
            <div className="mb-2 rounded-md border border-success/30 bg-success/10 px-3 py-1.5 text-sm text-success">
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
              <label className="text-xs text-text-secondary">Recipient wallet</label>
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
                <label className="text-xs text-text-secondary">Amount (LOOP)</label>
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
                <label className="text-xs text-text-secondary">Label</label>
                <input
                  name="label"
                  placeholder="Grantee name / community"
                  className={inputCls}
                  disabled={!chainConfigured}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-secondary">Reason (optional)</label>
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
          <p className="mb-3 text-xs text-text-secondary">
            A community must have an on-chain wallet before buyers can direct
            their allocation to it. This is a one-time registration.
          </p>
          {registerState.error && (
            <div className="mb-2 rounded-md border border-error/30 bg-error/10 px-3 py-1.5 text-sm text-error">
              {registerState.error}
            </div>
          )}
          {registerState.success && (
            <div className="mb-2 rounded-md border border-success/30 bg-success/10 px-3 py-1.5 text-sm text-success">
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
              <label className="text-xs text-text-secondary">Community</label>
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
              <label className="text-xs text-text-secondary">Wallet address</label>
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
          <DataTable>
            <DataTableHeader>
              <tr>
                <DataTableHead>When</DataTableHead>
                <DataTableHead>Recipient</DataTableHead>
                <DataTableHead>Label</DataTableHead>
                <DataTableHead align="right">Amount</DataTableHead>
                <DataTableHead className="hidden md:table-cell">Reason</DataTableHead>
                <DataTableHead>Tx</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {recent.map((r) => (
                <DataTableRow key={r.id}>
                  <DataTableCell numeric className="whitespace-nowrap text-caption text-text-secondary">
                    {new Date(r.created_at).toLocaleDateString()}
                  </DataTableCell>
                  <DataTableCell numeric>
                    {r.recipient_wallet.slice(0, 6)}…{r.recipient_wallet.slice(-4)}
                  </DataTableCell>
                  <DataTableCell className="text-caption">{r.recipient_label ?? "—"}</DataTableCell>
                  <DataTableCell numeric align="right" className="font-medium">
                    {Number(r.amount).toLocaleString()}
                  </DataTableCell>
                  <DataTableCell className="hidden text-caption text-text-secondary md:table-cell">
                    {r.reason ?? "—"}
                  </DataTableCell>
                  <DataTableCell>
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
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </div>
      )}
    </Glass>
  );
}
