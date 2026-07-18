import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const communityLevels = [
  "micro",
  "local",
  "city",
  "state",
  "national",
  "continental",
  "global",
] as const;

export type CommunityLevel = (typeof communityLevels)[number];

export const communities = pgTable(
  "communities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    level: text("level", { enum: communityLevels }).notNull(),

    // ltree path: global.americas.canada.bc.vancouver.local_12
    path: text("path").notNull(),

    parentId: uuid("parent_id").references((): any => communities.id),

    // H3 geographic index cells at the appropriate resolution
    h3Cells: jsonb("h3_cells").$type<string[]>().default([]),
    // Primary H3 cell for point-based queries
    h3Index: text("h3_index"),

    // Governance settings (configurable per community per the IGP)
    quorumSize: integer("quorum_size").notNull().default(10),
    quorumVolatilityDays: integer("quorum_volatility_days")
      .notNull()
      .default(90),
    dunbarLimit: integer("dunbar_limit").notNull().default(150),
    votingAnonymous: boolean("voting_anonymous").notNull().default(true),
    allowCandidates: boolean("allow_candidates").notNull().default(false),

    subjectTags: jsonb("subject_tags").$type<string[]>().default([]),

    // Fund balance tracked here, transactions in community_fund_transactions
    fundBalance: integer("fund_balance_cents").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("communities_path_idx").on(t.path),
    index("communities_parent_idx").on(t.parentId),
    index("communities_level_idx").on(t.level),
    index("communities_h3_idx").on(t.h3Index),
    uniqueIndex("communities_slug_parent_idx").on(t.slug, t.parentId),
  ]
);
