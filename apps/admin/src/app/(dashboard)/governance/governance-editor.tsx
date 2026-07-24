"use client";

import { useMemo, useState, useActionState, useEffect } from "react";
import { saveGovernanceSettings } from "./actions";
import {
  SETTING_FIELDS,
  formatFieldValue,
  displayFieldValue,
  type Scope,
} from "@/lib/governance-settings";

type Org = { id: string; name: string };
type CommunityRow = {
  id: string;
  name: string;
  subject: string;
  level: string;
  white_label_id: string | null;
};
type SettingsRow = {
  scope_type: string;
  white_label_id: string | null;
  subject: string | null;
  community_id: string | null;
  settings: Record<string, unknown>;
};

type ScopeType = "platform" | "white_label" | "subject" | "community";

const SOURCE_STYLES: Record<string, string> = {
  community: "border-red-500/40 bg-red-500/15 text-red-400",
  subject: "border-amber-500/40 bg-amber-500/15 text-amber-400",
  white_label: "border-blue-500/40 bg-blue-500/15 text-blue-400",
  platform: "border-border bg-secondary/50 text-muted-foreground",
};

const inputCls =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function GovernanceEditor({
  orgs,
  subjects,
  communities,
  allSettings,
  canEditPlatform,
  isPlatformAdmin,
  defaultOrgId,
}: {
  orgs: Org[];
  subjects: string[];
  communities: CommunityRow[];
  allSettings: SettingsRow[];
  canEditPlatform: boolean;
  isPlatformAdmin: boolean;
  defaultOrgId: string | null;
}) {
  const availableScopes: ScopeType[] = canEditPlatform
    ? ["platform", "white_label", "subject", "community"]
    : ["white_label", "subject", "community"];

  const [scopeType, setScopeType] = useState<ScopeType>(availableScopes[0]);
  const [orgId, setOrgId] = useState<string>(defaultOrgId ?? orgs[0]?.id ?? "");
  const [subject, setSubject] = useState<string>(subjects[0] ?? "");
  const [communityId, setCommunityId] = useState<string>("");

  const [state, formAction] = useActionState(saveGovernanceSettings, {
    error: "",
    success: "",
  });

  const scope: Scope | null = useMemo(() => {
    if (scopeType === "platform") return { type: "platform" };
    if (scopeType === "white_label") {
      if (!orgId) return null;
      return { type: "white_label", white_label_id: orgId };
    }
    if (scopeType === "subject") {
      if (!orgId || !subject) return null;
      return { type: "subject", white_label_id: orgId, subject };
    }
    if (scopeType === "community") {
      if (!communityId) return null;
      return { type: "community", community_id: communityId };
    }
    return null;
  }, [scopeType, orgId, subject, communityId]);

  // Current scope's raw settings blob (what is stored at this exact level)
  const currentRow = useMemo(() => {
    if (!scope) return null;
    return allSettings.find((r) => {
      if (r.scope_type !== scope.type) return false;
      if (scope.type === "platform") return r.white_label_id === null && r.community_id === null;
      if (scope.type === "white_label") return r.white_label_id === (scope as any).white_label_id;
      if (scope.type === "subject")
        return (
          r.white_label_id === (scope as any).white_label_id &&
          r.subject === (scope as any).subject
        );
      if (scope.type === "community") return r.community_id === (scope as any).community_id;
      return false;
    });
  }, [scope, allSettings]);

  // Effective merged values with source per key (CSS cascade preview)
  const effective = useMemo(() => {
    if (!scope) return { values: {} as Record<string, unknown>, sources: {} as Record<string, string> };

    const platform = allSettings.find((r) => r.scope_type === "platform");
    const layers: { level: string; settings: Record<string, unknown> }[] = [];

    if (platform) layers.push({ level: "platform", settings: platform.settings });

    if (scope.type === "white_label" || scope.type === "subject") {
      const wl = allSettings.find(
        (r) => r.scope_type === "white_label" && r.white_label_id === (scope as any).white_label_id
      );
      if (wl) layers.push({ level: "white_label", settings: wl.settings });
    }
    if (scope.type === "subject") {
      const subj = allSettings.find(
        (r) =>
          r.scope_type === "subject" &&
          r.white_label_id === (scope as any).white_label_id &&
          r.subject === (scope as any).subject
      );
      if (subj) layers.push({ level: "subject", settings: subj.settings });
    }
    if (scope.type === "community") {
      const community = communities.find((c) => c.id === (scope as any).community_id);
      if (community) {
        const wlIdFromCommunity = community.white_label_id;
        if (wlIdFromCommunity) {
          const wl = allSettings.find(
            (r) => r.scope_type === "white_label" && r.white_label_id === wlIdFromCommunity
          );
          if (wl) layers.push({ level: "white_label", settings: wl.settings });

          const subj = allSettings.find(
            (r) =>
              r.scope_type === "subject" &&
              r.white_label_id === wlIdFromCommunity &&
              r.subject === community.subject
          );
          if (subj) layers.push({ level: "subject", settings: subj.settings });
        }
        const comm = allSettings.find(
          (r) => r.scope_type === "community" && r.community_id === community.id
        );
        if (comm) layers.push({ level: "community", settings: comm.settings });
      }
    }

    const values: Record<string, unknown> = {};
    const sources: Record<string, string> = {};
    for (const layer of layers) {
      for (const [k, v] of Object.entries(layer.settings)) {
        values[k] = v;
        sources[k] = layer.level;
      }
    }
    return { values, sources };
  }, [scope, allSettings, communities]);

  const [formKey, setFormKey] = useState(0);
  useEffect(() => {
    setFormKey((k) => k + 1);
  }, [scope?.type, orgId, subject, communityId]);

  const filteredCommunities = useMemo(() => {
    if (isPlatformAdmin && !orgId) return communities;
    if (!orgId) return communities;
    return communities.filter((c) => c.white_label_id === orgId || c.white_label_id === null);
  }, [communities, orgId, isPlatformAdmin]);

  const scopeLabel: Record<ScopeType, string> = {
    platform: "Platform (defaults for everyone)",
    white_label: "White-label organization",
    subject: "Subject within an organization",
    community: "Individual community",
  };

  return (
    <div>
      {/* Scope tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {availableScopes.map((s) => (
          <button
            key={s}
            onClick={() => setScopeType(s)}
            className={`rounded-md px-3 py-1.5 text-sm capitalize transition-colors ${
              scopeType === s
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Scope pickers */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(scopeType === "white_label" || scopeType === "subject") &&
          (isPlatformAdmin || orgs.length > 1) && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Organization</label>
              <select
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                className={inputCls}
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        {scopeType === "subject" && (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={inputCls}
            >
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}
        {scopeType === "community" && (
          <div className="space-y-1 sm:col-span-2 lg:col-span-3">
            <label className="text-xs text-muted-foreground">Community</label>
            <select
              value={communityId}
              onChange={(e) => setCommunityId(e.target.value)}
              className={inputCls}
            >
              <option value="">Choose a community…</option>
              {filteredCommunities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.subject} · {c.level})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <p className="mb-4 text-xs text-muted-foreground">
        Editing <span className="font-medium text-foreground">{scopeLabel[scopeType]}</span>.
        Values you leave blank inherit from a higher level. The effective column
        on the right shows what a community using this scope would actually see.
      </p>

      {state.error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="mb-4 rounded-md border border-green-500/30 bg-green-500/10 px-4 py-2.5 text-sm text-green-400">
          {state.success}
        </div>
      )}

      {scope && (
        <form key={formKey} action={formAction} className="space-y-5">
          <input type="hidden" name="scope" value={JSON.stringify(scope)} />
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Setting</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                    Value at this scope
                  </th>
                  <th className="hidden px-4 py-2.5 text-left font-medium text-muted-foreground md:table-cell">
                    Effective
                  </th>
                </tr>
              </thead>
              <tbody>
                {SETTING_FIELDS.map((field) => {
                  const currentValue = currentRow?.settings?.[field.key];
                  const effValue = effective.values[field.key];
                  const effSource = effective.sources[field.key];
                  return (
                    <tr key={field.key} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium">{field.label}</p>
                        {field.helper && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{field.helper}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <input
                          type={field.type === "text" ? "text" : "number"}
                          name={field.key}
                          defaultValue={formatFieldValue(field, currentValue)}
                          placeholder={field.placeholder ?? "inherit"}
                          min={field.min}
                          max={field.max}
                          step={field.step}
                          className={inputCls}
                        />
                      </td>
                      <td className="hidden px-4 py-3 align-top md:table-cell">
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums">
                            {displayFieldValue(field, effValue)}
                          </span>
                          {effSource && (
                            <span
                              className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${
                                SOURCE_STYLES[effSource] ?? ""
                              }`}
                            >
                              {effSource.replace("_", " ")}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Save {scopeType.replace("_", " ")} settings
            </button>
          </div>
        </form>
      )}

      {!scope && (
        <div className="rounded-lg border border-border bg-card py-12 text-center text-sm text-muted-foreground">
          Choose a {scopeType.replace("_", " ")} above to edit its settings.
        </div>
      )}
    </div>
  );
}
