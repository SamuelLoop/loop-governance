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

export const tradeListings = pgTable(
  "trade_listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id),

    type: text("type", { enum: ["buy", "sell"] }).notNull(),
    category: text("category", { enum: ["commodity", "service"] }).notNull(),

    title: text("title").notNull(),
    description: text("description").notNull(),

    quantity: integer("quantity"),
    unit: text("unit"),
    priceCents: integer("price_cents").notNull(),
    priceFlexible: boolean("price_flexible").notNull().default(false),

    location: text("location"),
    h3Index: text("h3_index"),
    subjectTags: jsonb("subject_tags").$type<string[]>().default([]),

    availableFrom: timestamp("available_from", { withTimezone: true }),
    availableTo: timestamp("available_to", { withTimezone: true }),

    status: text("status", {
      enum: ["open", "matched", "confirmed", "closed", "cancelled"],
    })
      .notNull()
      .default("open"),

    matchedWithId: uuid("matched_with_id"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("listings_community_idx").on(t.communityId, t.status),
    index("listings_user_idx").on(t.userId),
    index("listings_type_category_idx").on(t.type, t.category, t.status),
    index("listings_h3_idx").on(t.h3Index),
  ]
);
