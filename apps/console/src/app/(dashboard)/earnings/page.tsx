import { createClient, createServiceClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type EarningRow = {
  id: string;
  type: string;
  amount: string;
  token_type: string;
  period_start: string;
  period_end: string;
  distributed_at: string;
  community: { name: string } | null;
};

function typeLabel(type: string) {
  switch (type) {
    case "leader_reward":
      return "Leader";
    case "participant_reward":
      return "Participant";
    case "delegator_reward":
      return "Delegator";
    default:
      return type;
  }
}

function typeBadgeVariant(type: string) {
  switch (type) {
    case "leader_reward":
      return "default" as const;
    case "participant_reward":
      return "secondary" as const;
    case "delegator_reward":
      return "outline" as const;
    default:
      return "outline" as const;
  }
}

export default async function EarningsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createServiceClient();
  const { data: profile } = await admin
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!profile) redirect("/login");

  const { data: earnings } = await admin
    .from("earnings")
    .select(
      `id, type, amount, token_type, period_start, period_end, distributed_at,
      community:communities!earnings_community_id_fkey(name)`
    )
    .eq("user_id", profile.id)
    .order("distributed_at", { ascending: false })
    .limit(100);

  const rows = (earnings ?? []) as unknown as EarningRow[];

  const totalByType = rows.reduce(
    (acc, e) => {
      acc[e.type] = (acc[e.type] ?? 0) + Number(e.amount);
      return acc;
    },
    {} as Record<string, number>
  );

  const grandTotal = Object.values(totalByType).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Earnings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your token rewards from governance participation.
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono">
              {grandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground">LOOP</p>
          </CardContent>
        </Card>

        {Object.entries(totalByType).map(([type, total]) => (
          <Card key={type}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {typeLabel(type)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold font-mono">
                {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground">LOOP</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No earnings yet. Participate in governance to start earning.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Community</th>
                    <th className="pb-2 pr-4">Type</th>
                    <th className="pb-2 pr-4">Period</th>
                    <th className="pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e) => (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                        {new Date(e.distributed_at).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 pr-4">
                        {e.community?.name ?? "Unknown"}
                      </td>
                      <td className="py-2.5 pr-4">
                        <Badge variant={typeBadgeVariant(e.type)}>
                          {typeLabel(e.type)}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                        {new Date(e.period_start).toLocaleDateString()} -{" "}
                        {new Date(e.period_end).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 text-right font-mono font-medium">
                        {Number(e.amount).toLocaleString(undefined, {
                          maximumFractionDigits: 4,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
