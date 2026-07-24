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

  const [{ data: orgs }, { data: loyaltyConfigs }] = await Promise.all([
    orgsQuery,
    admin
      .from("loyalty_config")
      .select("white_label_id, tokens_per_action, weekly_cap, streak_multiplier, streak_threshold_weeks, streak_bonus, delegation_reward"),
  ]);

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
        loyaltyConfigs={(loyaltyConfigs ?? []).map((l) => ({
          ...l,
          tokens_per_action: Number(l.tokens_per_action),
          streak_multiplier: Number(l.streak_multiplier),
          streak_bonus: Number(l.streak_bonus),
          delegation_reward: Number(l.delegation_reward),
        }))}
        defaultOrgId={session.whiteLabel?.id ?? null}
        canEdit={session.platformRole !== "org_manager"}
      />
    </div>
  );
}
