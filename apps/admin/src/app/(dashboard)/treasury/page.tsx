import { requireAdminSession } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase-server";
import { PageDescription } from "@/components/page-description";
import { ImpactTreasuryCard } from "./impact-treasury-card";
import { publicClient, chainConfig, LOOP_TOKEN_ABI, isConfigured, fromTokenUnits } from "@/lib/loop-token";
import type { Address } from "viem";

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default async function TreasuryPage() {
  const session = await requireAdminSession();
  const admin = createServiceClient();
  const isPlatformAdmin = session.platformRole === "platform_admin";

  const [{ data: balances }, { data: communities }, { data: recentTx }, { data: recentImpact }] = await Promise.all([
    admin.from("community_treasury_balance").select("*"),
    admin.from("communities").select("id, name, subject, level"),
    admin
      .from("treasury_transactions")
      .select("id, community_id, type, direction, amount, token_type, description, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    isPlatformAdmin
      ? admin
          .from("impact_treasury_transfers")
          .select("id, recipient_wallet, recipient_label, amount, reason, tx_hash, created_at")
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
  ]);

  // Read on-chain state for the Impact Treasury card if platform_admin
  let onChainBalance: number | null = null;
  let treasuryAddress: string | null = null;
  const chainConfigured = isConfigured();
  if (isPlatformAdmin && chainConfigured) {
    try {
      const { address } = chainConfig();
      const client = publicClient();
      treasuryAddress = (await client.readContract({
        address,
        abi: LOOP_TOKEN_ABI,
        functionName: "impactTreasury",
      })) as string;
      const raw = (await client.readContract({
        address,
        abi: LOOP_TOKEN_ABI,
        functionName: "balanceOf",
        args: [treasuryAddress as Address],
      })) as bigint;
      onChainBalance = fromTokenUnits(raw);
    } catch {
      // ignore; card renders with — placeholders
    }
  }

  const communityMap = new Map(
    (communities ?? []).map((c) => [c.id, { name: c.name, subject: c.subject, level: c.level }])
  );

  const rows = (balances ?? [])
    .map((b) => ({
      ...b,
      community: communityMap.get(b.community_id),
    }))
    .filter((b) => b.community)
    .sort((a, b) => Number(b.balance) - Number(a.balance));

  const totals = rows.reduce(
    (acc, r) => {
      acc.balance += Number(r.balance);
      acc.inflow += Number(r.total_inflow);
      acc.outflow += Number(r.total_outflow);
      return acc;
    },
    { balance: 0, inflow: 0, outflow: 0 }
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Treasury</h1>
        <p className="text-sm text-muted-foreground">
          Token balances and flows across {rows.length} community treasuries
        </p>
      </div>

      <PageDescription
        purpose="A financial overview of every community treasury: current balance, cumulative inflows and outflows, and the 50 most recent transactions across the platform."
        whenToUse="Use this page for financial oversight and audit: reconciling monthly reports, checking a community balance a member asked about, or investigating a suspicious spike in outflows. All figures are derived live from the treasury_transactions ledger, so numbers here are always current."
      />

      {isPlatformAdmin && (
        <div className="mb-8">
          <ImpactTreasuryCard
            communities={(communities ?? []).map((c) => ({
              id: c.id, name: c.name, level: c.level, subject: c.subject,
            }))}
            recent={(recentImpact ?? []).map((r: any) => ({
              ...r, amount: Number(r.amount),
            }))}
            onChainBalance={onChainBalance}
            treasuryAddress={treasuryAddress}
            chainConfigured={chainConfigured}
          />
        </div>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Balance</p>
          <p className="text-2xl font-bold tabular-nums">{fmt(totals.balance)}</p>
          <p className="text-xs text-muted-foreground">LOOP_TKN</p>
        </div>
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
          <p className="text-xs text-green-400">Total Inflows</p>
          <p className="text-2xl font-bold tabular-nums text-green-400">{fmt(totals.inflow)}</p>
        </div>
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-xs text-red-400">Total Outflows</p>
          <p className="text-2xl font-bold tabular-nums text-red-400">{fmt(totals.outflow)}</p>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Balances by Community</h2>
      <div className="mb-8 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Community</th>
              <th className="hidden px-4 py-2.5 text-left font-medium text-muted-foreground md:table-cell">Subject</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Balance</th>
              <th className="hidden px-4 py-2.5 text-right font-medium text-muted-foreground md:table-cell">Inflow</th>
              <th className="hidden px-4 py-2.5 text-right font-medium text-muted-foreground md:table-cell">Outflow</th>
              <th className="hidden px-4 py-2.5 text-right font-medium text-muted-foreground lg:table-cell">Transactions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.community_id}-${r.token_type}`} className="border-b border-border last:border-0 hover:bg-secondary/20">
                <td className="px-4 py-3">
                  <p className="font-medium">{r.community!.name}</p>
                  <p className="text-xs text-muted-foreground">{r.community!.level}</p>
                </td>
                <td className="hidden px-4 py-3 capitalize text-muted-foreground md:table-cell">
                  {r.community!.subject}
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">
                  {fmt(Number(r.balance))}
                </td>
                <td className="hidden px-4 py-3 text-right tabular-nums text-green-400 md:table-cell">
                  +{fmt(Number(r.total_inflow))}
                </td>
                <td className="hidden px-4 py-3 text-right tabular-nums text-red-400 md:table-cell">
                  -{fmt(Number(r.total_outflow))}
                </td>
                <td className="hidden px-4 py-3 text-right tabular-nums text-muted-foreground lg:table-cell">
                  {Number(r.inflow_count) + Number(r.outflow_count)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No treasury activity yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Recent Transactions</h2>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Time</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Community</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Amount</th>
              <th className="hidden px-4 py-2.5 text-left font-medium text-muted-foreground lg:table-cell">Description</th>
            </tr>
          </thead>
          <tbody>
            {(recentTx ?? []).map((tx) => (
              <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                  {new Date(tx.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  {communityMap.get(tx.community_id)?.name ?? "Unknown"}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground">{tx.type.replace(/_/g, " ")}</span>
                </td>
                <td className={`px-4 py-3 text-right tabular-nums ${
                  tx.direction === "inflow" ? "text-green-400" : "text-red-400"
                }`}>
                  {tx.direction === "inflow" ? "+" : "-"}{fmt(Number(tx.amount))}
                </td>
                <td className="hidden max-w-xs truncate px-4 py-3 text-xs text-muted-foreground lg:table-cell">
                  {tx.description ?? "—"}
                </td>
              </tr>
            ))}
            {(recentTx ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No transactions yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
