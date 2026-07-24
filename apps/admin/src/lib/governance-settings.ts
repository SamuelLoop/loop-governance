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
    default:
      return String(value);
  }
}

export type Scope =
  | { type: "platform" }
  | { type: "white_label"; white_label_id: string }
  | { type: "subject"; white_label_id: string; subject: string }
  | { type: "community"; community_id: string };
