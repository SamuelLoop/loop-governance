import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { communities } from "./communities";

export const proposalStatuses = [
  "draft",
  "open",
  "closed",
  "approved",
  "rejected",
] as const;

// Governance proposals (fund allocation, policy, trade rules)
export const proposals = pgTable(
  "proposals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),

    title: text("title").notNull(),
    description: text("description").notNull(),

    status: text("status", { enum: proposalStatuses })
      .notNull()
      .default("draft"),

    // Budget request in cents (if this is a fund allocation proposal)
    budgetRequestCents: integer("budget_request_cents"),

    // Policy fields from the IGP spec
    consequence: text("consequence"),

    // On-chain reference (populated when synced to Base L2)
    chainTxHash: text("chain_tx_hash"),

    votesFor: integer("votes_for").notNull().default(0),
    votesAgainst: integer("votes_against").notNull().default(0),

    opensAt: timestamp("opens_at", { withTimezone: true }),
    closesAt: timestamp("closes_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("proposals_community_idx").on(t.communityId, t.status),
    index("proposals_author_idx").on(t.authorId),
  ]
);

// Individual votes on proposals
export const votes = pgTable(
  "votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    proposalId: uuid("proposal_id")
      .notNull()
      .references(() => proposals.id, { onDelete: "cascade" }),
    voterId: uuid("voter_id")
      .notNull()
      .references(() => users.id),

    // Phase 1: direct vote. Phase 2: delegated vote weight
    choice: text("choice", { enum: ["for", "against", "abstain"] }).notNull(),
    weight: integer("weight").notNull().default(1),

    // Phase 2: if this vote was cast via delegation
    delegatedFrom: uuid("delegated_from"),

    chainTxHash: text("chain_tx_hash"),

    castAt: timestamp("cast_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("votes_proposal_idx").on(t.proposalId),
    index("votes_voter_idx").on(t.voterId),
  ]
);

// Community fund transactions
export const fundTransactions = pgTable(
  "fund_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),

    type: text("type", {
      enum: ["trade_fee", "allocation", "deposit", "withdrawal"],
    }).notNull(),
    amountCents: integer("amount_cents").notNull(),
    description: text("description"),

    // Link to the proposal that authorized this transaction
    proposalId: uuid("proposal_id").references(() => proposals.id),

    chainTxHash: text("chain_tx_hash"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("fund_tx_community_idx").on(t.communityId)]
);
