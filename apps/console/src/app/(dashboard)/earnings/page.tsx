import { createClient, createServiceClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { ConvertForm } from "./convert-form";
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
  DataTableEmpty,
} from "@loop/ui";

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
    case "loyalty_reward":
      return "Loyalty";
    case "streak_bonus":
      return "Streak bonus";
    case "loyalty_conversion":
      return "Conversion";
    default:
      return type;
  }
}

// Reward type is a category, not a severity/status signal — per
// DESIGN.web.md's StatusChip constraint (semantic colour only), this
// stays `neutral` across every type, same discipline as admin's
// moderation "target type" column (session 09): identity carried by the
// label text, not an invented categorical hue.

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

  const loopBalance = rows
    .filter((e) => e.token_type === "LOOP_TKN")
    .reduce((s, e) => s + Number(e.amount), 0);
  const loyaltyBalance = rows
    .filter((e) => e.token_type === "LOOP_LOYALTY")
    .reduce((s, e) => s + Number(e.amount), 0);

  // Look up the current conversion rate via any community the user is in
  const { data: firstMembership } = await admin
    .from("community_memberships")
    .select("community_id")
    .eq("user_id", profile.id)
    .limit(1)
    .maybeSingle();

  let conversionRate: number | null = null;
  if (firstMembership) {
    const { data: cascade } = await admin.rpc("resolve_governance_settings", {
      p_community_id: firstMembership.community_id,
    });
    const raw = (cascade as any)?.values?.loyalty_to_loop_rate;
    if (raw != null) conversionRate = Number(raw);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-h1 font-bold tracking-tight text-text-primary">Earnings</h1>
        <p className="mt-1 text-body text-text-secondary">
          Your token rewards from governance participation.
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatTile
          label="LOOP balance"
          value={loopBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        />
        <StatTile
          label="Loyalty balance"
          value={loyaltyBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        />
        <StatTile label="Records" value={rows.length} />
      </div>

      <Glass className="mb-6 p-5">
        <h2 className="mb-3 text-h2 font-bold text-text-primary">Convert loyalty to LOOP</h2>
        <ConvertForm balance={loyaltyBalance} rate={conversionRate} />
      </Glass>

      {rows.length === 0 ? (
        <Glass className="py-8 text-center text-body text-text-secondary">
          No earnings yet. Participate in governance to start earning.
        </Glass>
      ) : (
        <div>
          <h2 className="mb-3 text-h2 font-bold text-text-primary">History</h2>
          <DataTable>
            <DataTableHeader>
              <tr>
                <DataTableHead>Date</DataTableHead>
                <DataTableHead>Community</DataTableHead>
                <DataTableHead>Type</DataTableHead>
                <DataTableHead>Token</DataTableHead>
                <DataTableHead>Period</DataTableHead>
                <DataTableHead align="right">Amount</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {rows.map((e) => (
                <DataTableRow key={e.id}>
                  <DataTableCell className="whitespace-nowrap text-caption text-text-secondary">
                    {new Date(e.distributed_at).toLocaleDateString()}
                  </DataTableCell>
                  <DataTableCell>{e.community?.name ?? "Unknown"}</DataTableCell>
                  <DataTableCell>
                    <StatusChip variant="neutral">{typeLabel(e.type)}</StatusChip>
                  </DataTableCell>
                  <DataTableCell className="text-caption text-text-secondary">
                    {e.token_type === "LOOP_LOYALTY" ? "LOYALTY" : "LOOP"}
                  </DataTableCell>
                  <DataTableCell className="text-caption text-text-secondary">
                    {new Date(e.period_start).toLocaleDateString()} -{" "}
                    {new Date(e.period_end).toLocaleDateString()}
                  </DataTableCell>
                  <DataTableCell
                    numeric
                    align="right"
                    className={Number(e.amount) < 0 ? "text-error" : "text-text-primary"}
                  >
                    {Number(e.amount).toLocaleString(undefined, {
                      maximumFractionDigits: 4,
                    })}
                  </DataTableCell>
                </DataTableRow>
              ))}
              {rows.length === 0 && <DataTableEmpty colSpan={6}>No earnings yet</DataTableEmpty>}
            </DataTableBody>
          </DataTable>
        </div>
      )}
    </div>
  );
}
