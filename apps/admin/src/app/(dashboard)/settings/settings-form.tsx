"use client";

import { useState, useActionState } from "react";
import { updateOrgSettings, updateLoyaltyConfig } from "./actions";

type Org = {
  id: string;
  name: string;
  slug: string;
  domain: string;
  brand_name: string;
  brand_logo_url: string | null;
  brand_color: string | null;
  shared_auth: boolean;
};

type LoyaltyConfig = {
  white_label_id: string;
  award_votes: boolean;
  award_proposals: boolean;
  award_delegations: boolean;
  tokens_per_vote: number;
  tokens_per_proposal: number;
  tokens_per_delegation: number;
  weekly_cap: number;
  streak_multiplier: number;
  streak_threshold_weeks: number;
  streak_bonus: number;
  conversion_rate: number;
  has_override: boolean;
};

const inputCls =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function SettingsForm({
  orgs,
  loyaltyConfigs,
  defaultOrgId,
  canEdit,
}: {
  orgs: Org[];
  loyaltyConfigs: LoyaltyConfig[];
  defaultOrgId: string | null;
  canEdit: boolean;
}) {
  const [selectedOrgId, setSelectedOrgId] = useState(defaultOrgId ?? orgs[0]?.id ?? "");
  const org = orgs.find((o) => o.id === selectedOrgId);
  const loyalty = loyaltyConfigs.find((l) => l.white_label_id === selectedOrgId);

  const [orgState, orgAction] = useActionState(updateOrgSettings, { error: "", success: "" });
  const [loyaltyState, loyaltyAction] = useActionState(updateLoyaltyConfig, { error: "", success: "" });

  if (!org) {
    return (
      <div className="rounded-lg border border-border bg-card py-12 text-center text-sm text-muted-foreground">
        No organizations configured
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {orgs.length > 1 && (
        <div>
          <label className="text-sm font-medium">Organization</label>
          <select
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            className={`${inputCls} mt-1 max-w-xs`}
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-1 text-lg font-semibold">Branding</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {org.name} · {org.domain}
        </p>

        {orgState.error && (
          <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {orgState.error}
          </div>
        )}
        {orgState.success && (
          <div className="mb-3 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-400">
            {orgState.success}
          </div>
        )}

        <form action={orgAction} key={`org-${org.id}`} className="space-y-4">
          <input type="hidden" name="id" value={org.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Brand Name</label>
              <input
                name="brand_name"
                defaultValue={org.brand_name}
                disabled={!canEdit}
                required
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Brand Color</label>
              <div className="flex items-center gap-2">
                <input
                  name="brand_color"
                  defaultValue={org.brand_color ?? "#f59e0b"}
                  disabled={!canEdit}
                  pattern="^#[0-9a-fA-F]{6}$"
                  className={inputCls}
                />
                <span
                  className="h-8 w-8 shrink-0 rounded-md border border-border"
                  style={{ backgroundColor: org.brand_color ?? "#f59e0b" }}
                />
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Logo URL</label>
            <input
              name="brand_logo_url"
              defaultValue={org.brand_logo_url ?? ""}
              disabled={!canEdit}
              placeholder="https://..."
              className={inputCls}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="shared_auth"
              defaultChecked={org.shared_auth}
              disabled={!canEdit}
              className="h-4 w-4 rounded border-border"
            />
            Shared authentication (SSO with Loop)
          </label>
          {canEdit && (
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Save Branding
            </button>
          )}
        </form>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="mb-1 text-lg font-semibold">Loyalty Tokens</h2>
            <p className="text-sm text-muted-foreground">
              Loyalty rules for <span className="text-foreground">{org.name}</span>.
              Values shown are effective values (per-org override if set, otherwise
              the platform default). Editing here saves a per-org override in the
              governance cascade. For subject or community overrides use the{" "}
              <a href="/governance" className="text-primary underline">Governance</a>{" "}
              page.
            </p>
          </div>
          {loyalty?.has_override && (
            <span className="inline-flex shrink-0 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400">
              Override active
            </span>
          )}
        </div>

        {loyaltyState.error && (
          <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {loyaltyState.error}
          </div>
        )}
        {loyaltyState.success && (
          <div className="mb-3 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-400">
            {loyaltyState.success}
          </div>
        )}

        <form action={loyaltyAction} key={`loyalty-${org.id}`} className="space-y-4">
          <input type="hidden" name="white_label_id" value={org.id} />

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="award_votes"
                defaultChecked={loyalty?.award_votes ?? true}
                disabled={!canEdit}
                className="h-4 w-4 rounded border-border"
              />
              Award for votes
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="award_proposals"
                defaultChecked={loyalty?.award_proposals ?? true}
                disabled={!canEdit}
                className="h-4 w-4 rounded border-border"
              />
              Award for proposals
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="award_delegations"
                defaultChecked={loyalty?.award_delegations ?? true}
                disabled={!canEdit}
                className="h-4 w-4 rounded border-border"
              />
              Award for delegations
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Loyalty per vote</label>
              <input
                name="tokens_per_vote"
                type="number"
                step="0.01"
                min="0"
                defaultValue={loyalty?.tokens_per_vote ?? 1}
                disabled={!canEdit}
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Loyalty per proposal</label>
              <input
                name="tokens_per_proposal"
                type="number"
                step="0.01"
                min="0"
                defaultValue={loyalty?.tokens_per_proposal ?? 5}
                disabled={!canEdit}
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Loyalty per delegation</label>
              <input
                name="tokens_per_delegation"
                type="number"
                step="0.01"
                min="0"
                defaultValue={loyalty?.tokens_per_delegation ?? 0.5}
                disabled={!canEdit}
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Weekly Cap (per user)</label>
              <input
                name="weekly_cap"
                type="number"
                min="0"
                defaultValue={loyalty?.weekly_cap ?? 50}
                disabled={!canEdit}
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Streak Multiplier</label>
              <input
                name="streak_multiplier"
                type="number"
                step="0.01"
                min="0"
                defaultValue={loyalty?.streak_multiplier ?? 1.0}
                disabled={!canEdit}
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Streak Threshold (weeks)</label>
              <input
                name="streak_threshold_weeks"
                type="number"
                min="0"
                defaultValue={loyalty?.streak_threshold_weeks ?? 4}
                disabled={!canEdit}
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Streak Bonus (one-off)</label>
              <input
                name="streak_bonus"
                type="number"
                step="0.01"
                min="0"
                defaultValue={loyalty?.streak_bonus ?? 10}
                disabled={!canEdit}
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Loyalty → LOOP rate</label>
              <input
                name="conversion_rate"
                type="number"
                step="0.001"
                min="0"
                defaultValue={loyalty?.conversion_rate ?? 0.01}
                disabled={!canEdit}
                className={inputCls}
              />
            </div>
          </div>
          {canEdit && (
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Save Loyalty Settings
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
