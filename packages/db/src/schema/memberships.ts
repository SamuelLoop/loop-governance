import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { communities } from "./communities";

export const membershipRoles = ["member", "quorum", "admin"] as const;
export type MembershipRole = (typeof membershipRoles)[number];

export const communityMemberships = pgTable(
  "community_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),

    role: text("role", { enum: membershipRoles }).notNull().default("member"),

    // Communication preferences (ported from LiquidLoops fan_artist)
    channelPrefs: jsonb("channel_prefs")
      .$type<{ email: boolean; sms: boolean; push: boolean }>()
      .default({ email: true, sms: false, push: true }),

    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("membership_user_community_idx").on(t.userId, t.communityId),
    index("membership_community_idx").on(t.communityId),
    index("membership_role_idx").on(t.communityId, t.role),
  ]
);
