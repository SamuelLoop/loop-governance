import {
  pgTable,
  uuid,
  text,
  timestamp,
  real,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { communities } from "./communities";

// Peer-to-peer accreditation: "I accredit this person in this subject"
export const accreditations = pgTable(
  "accreditations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    giverId: uuid("giver_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    receiverId: uuid("receiver_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),

    subjectTag: text("subject_tag").notNull(),

    // Weight is derived from the giver's own accreditation score (PageRank-style)
    // Recomputed by the score refresh job
    weight: real("weight").notNull().default(1),

    active: boolean("active").notNull().default(true),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("accreditation_pair_subject_idx").on(
      t.giverId,
      t.receiverId,
      t.communityId,
      t.subjectTag
    ),
    index("accreditation_receiver_idx").on(t.receiverId, t.communityId),
    index("accreditation_community_subject_idx").on(
      t.communityId,
      t.subjectTag
    ),
  ]
);

// Materialized accreditation scores, recomputed by pg_cron
export const accreditationScores = pgTable(
  "accreditation_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    subjectTag: text("subject_tag").notNull(),

    // Computed PageRank-style score
    score: real("score").notNull().default(0),
    // Rank within community for this subject
    rank: real("rank").notNull().default(0),

    computedAt: timestamp("computed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("score_user_community_subject_idx").on(
      t.userId,
      t.communityId,
      t.subjectTag
    ),
    index("score_community_rank_idx").on(t.communityId, t.subjectTag, t.score),
  ]
);
