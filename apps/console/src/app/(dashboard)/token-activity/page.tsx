import { createClient, createServiceClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { TokenActivityClient } from "./token-activity-client";
import {
  Glass,
  StatTile,
  StatusChip,
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
} from "@loop/ui";

export default async function TokenActivityPage() {
  const supabase = await createClient();
  const admin = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await admin
    .from("users")
    .select("id, platform_role")
    .eq("auth_id", user.id)
    .single();

  if (!profile) redirect("/");

  // Aggregate stats are public to any logged-in member; the per-row
  // purchase table with wallets + timing is admin-only — a real,
  // render-time role check (not just a server-action guard), so this is
  // the genuine space="admin" case the brief calls out explicitly.
  const isAdmin = ["platform_admin", "org_admin", "org_manager"].includes(
    profile.platform_role ?? ""
  );

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    { data: allPurchases },
    { data: todayPurchases },
    { data: weekPurchases },
    { data: monthPurchases },
    { count: totalBuyers },
  ] = await Promise.all([
    admin
      .from("token_purchases")
      .select("id, amount, impact_amount, allocation_amount, price_usd, status, wallet_address, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("token_purchases")
      .select("amount, price_usd")
      .gte("created_at", today.toISOString()),
    admin
      .from("token_purchases")
      .select("amount, price_usd")
      .gte("created_at", weekAgo.toISOString()),
    admin
      .from("token_purchases")
      .select("amount, price_usd")
      .gte("created_at", monthAgo.toISOString()),
    admin
      .from("token_purchases")
      .select("user_id", { count: "exact", head: true }),
  ]);

  const sumTokens = (rows: any[]) => rows.reduce((s, r) => s + Number(r.amount), 0);
  const sumUsd = (rows: any[]) => rows.reduce((s, r) => s + Number(r.price_usd ?? 0), 0);

  const stats = {
    todayTokens: sumTokens(todayPurchases ?? []),
    todayUsd: sumUsd(todayPurchases ?? []),
    todayCount: (todayPurchases ?? []).length,
    weekTokens: sumTokens(weekPurchases ?? []),
    weekUsd: sumUsd(weekPurchases ?? []),
    weekCount: (weekPurchases ?? []).length,
    monthTokens: sumTokens(monthPurchases ?? []),
    monthUsd: sumUsd(monthPurchases ?? []),
    monthCount: (monthPurchases ?? []).length,
    totalBuyers: totalBuyers ?? 0,
  };

  const purchases = (allPurchases ?? []).map((p: any) => ({
    id: p.id,
    amount: Number(p.amount),
    impactAmount: Number(p.impact_amount ?? 0),
    allocationAmount: Number(p.allocation_amount ?? 0),
    totalMinted: Number(p.amount) + Number(p.impact_amount ?? 0) + Number(p.allocation_amount ?? 0),
    priceUsd: Number(p.price_usd ?? 0),
    status: p.status as string,
    hasWallet: !!p.wallet_address,
    createdAt: p.created_at as string,
  }));

  return (
    <div className="max-w-4xl">
      <h1 className="mb-1 text-h1 font-bold tracking-tight text-text-primary">
        Token Activity
      </h1>
      <p className="mb-6 text-body text-text-secondary">
        Real-time LOOP token purchase volume and activity.
      </p>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile
          label="Today"
          value={stats.todayTokens.toLocaleString()}
          className="text-center"
        />
        <StatTile
          label="This week"
          value={stats.weekTokens.toLocaleString()}
          className="text-center"
        />
        <StatTile
          label="This month"
          value={stats.monthTokens.toLocaleString()}
          className="text-center"
        />
        <StatTile label="Unique buyers" value={stats.totalBuyers} className="text-center" />
      </div>
      <div className="-mt-4 mb-6 grid grid-cols-2 gap-4 text-center text-caption text-text-secondary sm:grid-cols-4">
        <p>LOOP ({stats.todayCount} purchases)</p>
        <p>LOOP ({stats.weekCount} purchases)</p>
        <p>LOOP ({stats.monthCount} purchases)</p>
        <p>all time</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Glass className="p-4 text-center">
          <p className="text-caption font-medium uppercase tracking-wider text-text-secondary">
            Revenue today
          </p>
          <p className="mt-1 font-mono text-data-lg font-bold tabular-nums text-success">
            ${stats.todayUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </Glass>
        <Glass className="p-4 text-center">
          <p className="text-caption font-medium uppercase tracking-wider text-text-secondary">
            Revenue this week
          </p>
          <p className="mt-1 font-mono text-data-lg font-bold tabular-nums text-success">
            ${stats.weekUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </Glass>
        <Glass className="p-4 text-center">
          <p className="text-caption font-medium uppercase tracking-wider text-text-secondary">
            Revenue this month
          </p>
          <p className="mt-1 font-mono text-data-lg font-bold tabular-nums text-success">
            ${stats.monthUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </Glass>
      </div>

      <TokenActivityClient />

      {isAdmin ? (
        <div className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 text-caption font-medium uppercase tracking-wider text-text-secondary">
            Recent purchases
            <span className="normal-case text-[10px] text-text-muted">(admin only)</span>
          </h2>
          {purchases.length > 0 ? (
            <DataTable space="admin">
              <DataTableHeader>
                <tr>
                  <DataTableHead>Date</DataTableHead>
                  <DataTableHead>Buyer tokens</DataTableHead>
                  <DataTableHead>Total minted</DataTableHead>
                  <DataTableHead>USD</DataTableHead>
                  <DataTableHead>Method</DataTableHead>
                  <DataTableHead>Status</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {purchases.map((p) => (
                  <DataTableRow key={p.id}>
                    <DataTableCell numeric className="text-text-secondary">
                      {new Date(p.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </DataTableCell>
                    <DataTableCell numeric className="font-medium">
                      {p.amount.toLocaleString()} LOOP
                    </DataTableCell>
                    <DataTableCell numeric className="text-text-secondary">
                      {p.totalMinted.toLocaleString()}
                    </DataTableCell>
                    <DataTableCell numeric className="text-success">
                      ${p.priceUsd.toFixed(2)}
                    </DataTableCell>
                    <DataTableCell>
                      <StatusChip variant="neutral">{p.hasWallet ? "crypto" : "card"}</StatusChip>
                    </DataTableCell>
                    <DataTableCell>
                      <StatusChip variant={p.status === "completed" ? "success" : "neutral"}>
                        {p.status}
                      </StatusChip>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          ) : (
            <Glass space="admin" className="py-8 text-center text-body text-text-secondary">
              No purchases yet. Share your buy page to get started.
            </Glass>
          )}
        </div>
      ) : (
        <Glass className="mt-6 px-4 py-3 text-caption text-text-secondary">
          Aggregate stats above are public. Individual purchases are only
          visible to platform admins for privacy.
        </Glass>
      )}
    </div>
  );
}
