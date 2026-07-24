import { createClient, createServiceClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TokenActivityClient } from "./token-activity-client";

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
  // purchase table with wallets + timing is admin-only.
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
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        Token Activity
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Real-time LOOP token purchase volume and activity.
      </p>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {stats.todayTokens.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              LOOP ({stats.todayCount} purchases)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              This week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {stats.weekTokens.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              LOOP ({stats.weekCount} purchases)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              This month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {stats.monthTokens.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              LOOP ({stats.monthCount} purchases)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Unique buyers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {stats.totalBuyers}
            </p>
            <p className="text-xs text-muted-foreground">all time</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Revenue today
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-green-500">
              ${stats.todayUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Revenue this week
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-green-500">
              ${stats.weekUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Revenue this month
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-green-500">
              ${stats.monthUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      <TokenActivityClient />

      {isAdmin ? (
        <div className="mt-6">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Recent purchases <span className="normal-case text-[10px] text-amber-400/70">(admin only)</span>
          </h2>
          {purchases.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Buyer tokens</th>
                  <th className="pb-2 font-medium">Total minted</th>
                  <th className="pb-2 font-medium">USD</th>
                  <th className="pb-2 font-medium">Method</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id} className="border-b border-border/50">
                    <td className="py-2.5 tabular-nums text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2.5 font-medium tabular-nums">
                      {p.amount.toLocaleString()} LOOP
                    </td>
                    <td className="py-2.5 tabular-nums text-muted-foreground">
                      {p.totalMinted.toLocaleString()}
                    </td>
                    <td className="py-2.5 tabular-nums text-green-500">
                      ${p.priceUsd.toFixed(2)}
                    </td>
                    <td className="py-2.5">
                      <Badge variant="outline" className="text-[10px]">
                        {p.hasWallet ? "crypto" : "card"}
                      </Badge>
                    </td>
                    <td className="py-2.5">
                      <Badge
                        variant={p.status === "completed" ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {p.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No purchases yet. Share your buy page to get started.
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="mt-6 rounded-md border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
          Aggregate stats above are public. Individual purchases are only
          visible to platform admins for privacy.
        </div>
      )}
    </div>
  );
}
