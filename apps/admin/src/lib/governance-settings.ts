export type SettingField = {
  key: string;
  label: string;
  type: "number" | "percent" | "money_cents" | "text" | "boolean";
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  helper?: string;
};

export const SETTING_FIELDS: SettingField[] = [
  {
    key: "quorum_size",
    label: "Leadership group size",
    type: "number",
    min: 1,
    max: 500,
    step: 1,
    placeholder: "10",
    helper: "How many seats the community elects into its leadership group.",
  },
  {
    key: "quorum_threshold_pct",
    label: "Leadership entry threshold %",
    type: "percent",
    min: 0,
    max: 100,
    step: 0.5,
    placeholder: "10",
    helper: "Minimum share of community votes a candidate needs to win a seat. Not yet enforced by the tally function.",
  },
  {
    key: "dunbar_limit",
    label: "Dunbar limit",
    type: "number",
    min: 10,
    max: 5000,
    step: 10,
    placeholder: "150",
    helper: "Soft cap on membership before the split algorithm kicks in.",
  },
  {
    key: "max_delegation_depth",
    label: "Max delegation depth",
    type: "number",
    min: 1,
    max: 25,
    step: 1,
    placeholder: "10",
    helper: "How many hops a delegation chain may traverse.",
  },
  {
    key: "delegation_decay",
    label: "Delegation decay",
    type: "number",
    min: 0,
    max: 1,
    step: 0.01,
    placeholder: "1.0",
    helper: "Weight retained per hop. 1.0 = no loss; 0.9 = 10% loss per hop.",
  },
  {
    key: "proposal_cap_cents",
    label: "Proposal spending cap",
    type: "money_cents",
    min: 0,
    step: 100,
    placeholder: "5000",
    helper: "Maximum US dollars any single proposal can request. Leave blank for no cap.",
  },
  {
    key: "default_visibility",
    label: "Default visibility",
    type: "text",
    placeholder: "public",
    helper: "public or private. Applied to newly created sub-communities.",
  },
  {
    key: "loyalty_award_votes",
    label: "Award loyalty for votes",
    type: "boolean",
    helper: "Give LOOP_LOYALTY when a member casts a proposal or election vote.",
  },
  {
    key: "loyalty_tokens_per_vote",
    label: "Loyalty per vote",
    type: "number",
    min: 0,
    step: 0.1,
    placeholder: "1",
    helper: "LOOP_LOYALTY paid for each vote (before weekly cap and streak multiplier).",
  },
  {
    key: "loyalty_award_proposals",
    label: "Award loyalty for proposals",
    type: "boolean",
    helper: "Give LOOP_LOYALTY when a member authors a proposal.",
  },
  {
    key: "loyalty_tokens_per_proposal",
    label: "Loyalty per proposal",
    type: "number",
    min: 0,
    step: 0.1,
    placeholder: "5",
    helper: "LOOP_LOYALTY paid for authoring a proposal.",
  },
  {
    key: "loyalty_award_delegations",
    label: "Award loyalty for delegations given",
    type: "boolean",
    helper: "Give LOOP_LOYALTY when a member delegates their vote (once per delegation, not per proposal).",
  },
  {
    key: "loyalty_tokens_per_delegation",
    label: "Loyalty per delegation",
    type: "number",
    min: 0,
    step: 0.1,
    placeholder: "0.5",
    helper: "LOOP_LOYALTY paid when a delegation is created.",
  },
  {
    key: "loyalty_weekly_cap",
    label: "Weekly loyalty cap",
    type: "number",
    min: 0,
    step: 1,
    placeholder: "50",
    helper: "Maximum LOOP_LOYALTY a single user can earn in a week, across every community.",
  },
  {
    key: "loyalty_streak_threshold_weeks",
    label: "Streak threshold (weeks)",
    type: "number",
    min: 1,
    max: 52,
    step: 1,
    placeholder: "4",
    helper: "How many consecutive earning weeks before the streak multiplier and streak bonus kick in.",
  },
  {
    key: "loyalty_streak_multiplier",
    label: "Streak multiplier",
    type: "number",
    min: 1,
    max: 5,
    step: 0.05,
    placeholder: "1.0",
    helper: "Multiplier applied to base earnings while the streak is active. 1.0 = no boost.",
  },
  {
    key: "loyalty_streak_bonus",
    label: "Streak bonus (one-off)",
    type: "number",
    min: 0,
    step: 1,
    placeholder: "10",
    helper: "One-time LOOP_LOYALTY payout when a user first crosses the streak threshold.",
  },
  {
    key: "loyalty_to_loop_rate",
    label: "LOYALTY → LOOP conversion rate",
    type: "number",
    min: 0,
    max: 1,
    step: 0.001,
    placeholder: "0.01",
    helper: "How much LOOP_TKN a member gets per 1 LOOP_LOYALTY converted. Keep small to protect market value.",
  },
  {
    key: "governance_motivation_pct",
    label: "Governance motivation % per hop",
    type: "percent",
    min: 0,
    max: 50,
    step: 0.5,
    placeholder: "5",
    helper: "Percentage of each authorised money movement paid to the deciding community's voters. Higher-level leaders earn more because higher-level hops route larger amounts.",
  },
  {
    key: "governance_motivation_max_pct_of_origin",
    label: "Governance motivation hard cap %",
    type: "percent",
    min: 0,
    max: 100,
    step: 0.5,
    placeholder: "20",
    helper: "Hard ceiling on the total motivation payout for a single disbursement, expressed as % of the origin amount. Once the pot is exhausted, further hops earn nothing.",
  },
  {
    key: "governance_motivation_weighting",
    label: "Motivation split within a community",
    type: "text",
    placeholder: "equal",
    helper: "How the motivation cut is split among a community's voters on the proposal. 'equal' (default) or 'by_vote_weight' (future).",
  },
];

export function parseFieldValue(field: SettingField, raw: string): unknown | null {
  const s = raw.trim();
  if (s === "") return null;
  switch (field.type) {
    case "number":
    case "percent":
    case "money_cents":
      const n = Number(s);
      if (Number.isNaN(n)) return null;
      return field.type === "money_cents" ? Math.round(n * 100) : n;
    case "boolean":
      return s === "true" || s === "on" || s === "1";
    default:
      return s;
  }
}

export function formatFieldValue(field: SettingField, value: unknown): string {
  if (value === null || value === undefined) return "";
  switch (field.type) {
    case "money_cents":
      return typeof value === "number" ? (value / 100).toString() : String(value);
    case "boolean":
      return value === true || value === "true" ? "true" : "false";
    default:
      return String(value);
  }
}

export function displayFieldValue(field: SettingField, value: unknown): string {
  if (value === null || value === undefined) return "—";
  switch (field.type) {
    case "money_cents":
      return typeof value === "number" ? `$${(value / 100).toLocaleString()}` : String(value);
    case "percent":
      return `${value}%`;
    case "boolean":
      return value === true || value === "true" ? "on" : "off";
    default:
      return String(value);
  }
}

export type Scope =
  | { type: "platform" }
  | { type: "white_label"; white_label_id: string }
  | { type: "subject"; white_label_id: string; subject: string }
  | { type: "community"; community_id: string };
