import { requireAdminSession } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase-server";
import { SettingsForm } from "./settings-form";
import { PageDescription } from "@/components/page-description";

export default async function SettingsPage() {
  const session = await requireAdminSession();
  const admin = createServiceClient();
  const isPlatformAdmin = session.platformRole === "platform_admin";

  let orgsQuery = admin
    .from("white_label_configs")
    .select("id, name, slug, domain, brand_name, brand_logo_url, brand_color, shared_auth")
    .order("name");

  if (!isPlatformAdmin && session.whiteLabel) {
    orgsQuery = orgsQuery.eq("id", session.whiteLabel.id);
  }

  // Loyalty settings now live in the governance_settings cascade. Read
  // both the platform default and per-white_label override; the settings
  // form composes the effective values for each org (per-org override
  // if present, otherwise the platform default).
  const [{ data: orgs }, { data: cascadeRows }] = await Promise.all([
    orgsQuery,
    admin
      .from("governance_settings")
      .select("scope_type, white_label_id, settings")
      .in("scope_type", ["platform", "white_label"]),
  ]);

  const platformSettings =
    ((cascadeRows ?? []).find((r) => r.scope_type === "platform")?.settings as
      | Record<string, unknown>
      | undefined) ?? {};

  const overridesByOrg = new Map<string, Record<string, unknown>>();
  for (const r of cascadeRows ?? []) {
    if (r.scope_type === "white_label" && r.white_label_id) {
      overridesByOrg.set(r.white_label_id, (r.settings ?? {}) as Record<string, unknown>);
    }
  }

  const num = (v: unknown, fallback: number): number => {
    if (v === null || v === undefined) return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  const bool = (v: unknown, fallback: boolean): boolean => {
    if (v === null || v === undefined) return fallback;
    return v === true || v === "true";
  };

  const loyaltyConfigs = (orgs ?? []).map((o) => {
    const override = overridesByOrg.get(o.id) ?? {};
    const eff = { ...platformSettings, ...override };
    return {
      white_label_id: o.id,
      award_votes: bool(eff.loyalty_award_votes, true),
      award_proposals: bool(eff.loyalty_award_proposals, true),
      award_delegations: bool(eff.loyalty_award_delegations, true),
      tokens_per_vote: num(eff.loyalty_tokens_per_vote, 1),
      tokens_per_proposal: num(eff.loyalty_tokens_per_proposal, 5),
      tokens_per_delegation: num(eff.loyalty_tokens_per_delegation, 0.5),
      weekly_cap: num(eff.loyalty_weekly_cap, 50),
      streak_multiplier: num(eff.loyalty_streak_multiplier, 1),
      streak_threshold_weeks: num(eff.loyalty_streak_threshold_weeks, 4),
      streak_bonus: num(eff.loyalty_streak_bonus, 10),
      conversion_rate: num(eff.loyalty_to_loop_rate, 0.01),
      has_override: overridesByOrg.has(o.id),
    };
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Organization branding and loyalty token configuration
        </p>
      </div>

      <PageDescription
        purpose="Per-organization configuration in two blocks. Branding controls how the organization appears to its members (name, colour, logo, SSO with Loop). Loyalty tokens control the regional token earning rules: tokens per action, weekly cap, streak multipliers and delegation rewards."
        whenToUse="Update branding when the organization rebrands or wants a new accent colour. Adjust loyalty rules when tuning engagement: raise the cap during a launch push, or lower it after a period of over-issuance. Changes take effect immediately for all members of the organization."
      />

      <SettingsForm
        orgs={orgs ?? []}
        loyaltyConfigs={loyaltyConfigs}
        defaultOrgId={session.whiteLabel?.id ?? null}
        canEdit={session.platformRole !== "org_manager"}
      />
    </div>
  );
}
