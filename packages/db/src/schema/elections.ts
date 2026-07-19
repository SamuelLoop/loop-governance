import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { communities } from "./communities";

export const electionStatuses = [
  "nominations",
  "voting",
  "completed",
  "cancelled",
] as const;

export const elections = pgTable(
  "elections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),

    title: text("title").notNull(),
    description: text("description"),

    status: text("status", { enum: electionStatuses })
      .notNull()
      .default("nominations"),

    // How many seats are being elected
    seats: integer("seats").notNull().default(5),

    // Term length in days for the winners
    termDays: integer("term_days").notNull().default(90),

    // Phase timestamps
    nominationsOpen: timestamp("nominations_open", { withTimezone: true })
      .notNull()
      .defaultNow(),
    nominationsClose: timestamp("nominations_close", { withTimezone: true })
      .notNull(),
    votingOpen: timestamp("voting_open", { withTimezone: true }).notNull(),
    votingClose: timestamp("voting_close", { withTimezone: true }).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("elections_community_idx").on(t.communityId, t.status),
    index("elections_status_idx").on(t.status),
  ]
);

export const candidates = pgTable(
  "candidates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    electionId: uuid("election_id")
      .notNull()
      .references(() => elections.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    statement: text("statement"),
    subjectExpertise: text("subject_expertise"),

    votesReceived: integer("votes_received").notNull().default(0),
    elected: boolean("elected").notNull().default(false),

    nominatedAt: timestamp("nominated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("candidate_election_user_idx").on(t.electionId, t.userId),
    index("candidate_election_idx").on(t.electionId),
  ]
);

export const electionVotes = pgTable(
  "election_votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    electionId: uuid("election_id")
      .notNull()
      .references(() => elections.id, { onDelete: "cascade" }),
    voterId: uuid("voter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),

    weight: integer("weight").notNull().default(1),

    castAt: timestamp("cast_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("election_vote_unique_idx").on(
      t.electionId,
      t.voterId,
      t.candidateId
    ),
    index("election_vote_election_idx").on(t.electionId),
    index("election_vote_candidate_idx").on(t.candidateId),
  ]
);

// Tracks quorum terms: who holds power and when it expires
export const quorumTerms = pgTable(
  "quorum_terms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    electionId: uuid("election_id").references(() => elections.id),

    startsAt: timestamp("starts_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    active: boolean("active").notNull().default(true),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("quorum_term_community_idx").on(t.communityId, t.active),
    index("quorum_term_user_idx").on(t.userId),
    index("quorum_term_expires_idx").on(t.expiresAt),
  ]
);
