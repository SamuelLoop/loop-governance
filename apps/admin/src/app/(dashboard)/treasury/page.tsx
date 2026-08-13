import { requireAdminSession } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase-server";
import { PageDescription } from "@/components/page-description";
import { ImpactTreasuryCard } from "./impact-treasury-card";
import { publicClient, chainConfig, LOOP_TOKEN_ABI, isConfigured, fromTokenUnits } from "@/lib/loop-token";
import type { Address } from "viem";
import {
  Glass,
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
  DataTableEmpty,
} from "@loop/ui";

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
        <h1 className="text-h1 font-bold tracking-tight">Treasury</h1>
        <p className="text-body text-text-secondary">
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
        <Glass space="admin" className="p-4">
          <p className="text-caption text-text-secondary">Total Balance</p>
          <p className="font-mono text-data-lg font-bold tabular-nums text-text-primary">{fmt(totals.balance)}</p>
          <p className="text-caption text-text-secondary">LOOP_TKN</p>
        </Glass>
        <Glass space="admin" className="p-4">
          <p className="text-caption text-success">Total Inflows</p>
          <p className="font-mono text-data-lg font-bold tabular-nums text-success">{fmt(totals.inflow)}</p>
        </Glass>
        <Glass space="admin" className="p-4">
          <p className="text-caption text-error">Total Outflows</p>
          <p className="font-mono text-data-lg font-bold tabular-nums text-error">{fmt(totals.outflow)}</p>
        </Glass>
      </div>

      <h2 className="mb-3 text-h2 font-bold">Balances by Community</h2>
      <div className="mb-8">
        <DataTable>
          <DataTableHeader>
            <tr>
              <DataTableHead>Community</DataTableHead>
              <DataTableHead className="hidden md:table-cell">Subject</DataTableHead>
              <DataTableHead align="right">Balance</DataTableHead>
              <DataTableHead align="right" className="hidden md:table-cell">Inflow</DataTableHead>
              <DataTableHead align="right" className="hidden md:table-cell">Outflow</DataTableHead>
              <DataTableHead align="right" className="hidden lg:table-cell">Transactions</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {rows.map((r) => (
              <DataTableRow key={`${r.community_id}-${r.token_type}`}>
                <DataTableCell>
                  <p className="font-medium">{r.community!.name}</p>
                  <p className="text-caption text-text-secondary">{r.community!.level}</p>
                </DataTableCell>
                <DataTableCell className="hidden capitalize text-text-secondary md:table-cell">
                  {r.community!.subject}
                </DataTableCell>
                <DataTableCell numeric align="right" className="font-medium">
                  {fmt(Number(r.balance))}
                </DataTableCell>
                <DataTableCell numeric align="right" className="hidden text-success md:table-cell">
                  +{fmt(Number(r.total_inflow))}
                </DataTableCell>
                <DataTableCell numeric align="right" className="hidden text-error md:table-cell">
                  -{fmt(Number(r.total_outflow))}
                </DataTableCell>
                <DataTableCell numeric align="right" className="hidden text-text-secondary lg:table-cell">
                  {Number(r.inflow_count) + Number(r.outflow_count)}
                </DataTableCell>
              </DataTableRow>
            ))}
            {rows.length === 0 && <DataTableEmpty colSpan={6}>No treasury activity yet</DataTableEmpty>}
          </DataTableBody>
        </DataTable>
      </div>

      <h2 className="mb-3 text-h2 font-bold">Recent Transactions</h2>
      <DataTable>
        <DataTableHeader>
          <tr>
            <DataTableHead>Time</DataTableHead>
            <DataTableHead>Community</DataTableHead>
            <DataTableHead>Type</DataTableHead>
            <DataTableHead align="right">Amount</DataTableHead>
            <DataTableHead className="hidden lg:table-cell">Description</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {(recentTx ?? []).map((tx) => (
            <DataTableRow key={tx.id}>
              <DataTableCell numeric className="whitespace-nowrap text-caption text-text-secondary">
                {new Date(tx.created_at).toLocaleString()}
              </DataTableCell>
              <DataTableCell>
                {communityMap.get(tx.community_id)?.name ?? "Unknown"}
              </DataTableCell>
              <DataTableCell className="text-caption text-text-secondary">
                {tx.type.replace(/_/g, " ")}
              </DataTableCell>
              <DataTableCell
                numeric
                align="right"
                className={tx.direction === "inflow" ? "text-success" : "text-error"}
              >
                {tx.direction === "inflow" ? "+" : "-"}{fmt(Number(tx.amount))}
              </DataTableCell>
              <DataTableCell className="hidden max-w-xs truncate text-caption text-text-secondary lg:table-cell">
                {tx.description ?? "—"}
              </DataTableCell>
            </DataTableRow>
          ))}
          {(recentTx ?? []).length === 0 && (
            <DataTableEmpty colSpan={5}>No transactions yet</DataTableEmpty>
          )}
        </DataTableBody>
      </DataTable>
    </div>
  );
}
