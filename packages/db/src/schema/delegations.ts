import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { communities } from "./communities";

export const delegations = pgTable(
  "delegations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    delegatorId: uuid("delegator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    delegateId: uuid("delegate_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),

    subjectTag: text("subject_tag").notNull(),

    active: boolean("active").notNull().default(true),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("delegation_unique_idx").on(
      t.delegatorId,
      t.communityId,
      t.subjectTag
    ),
    index("delegation_delegate_idx").on(t.delegateId, t.communityId),
    index("delegation_community_subject_idx").on(t.communityId, t.subjectTag),
  ]
);
