import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Links to Supabase Auth user
    authId: uuid("auth_id").unique(),

    displayName: text("display_name").notNull(),
    email: text("email").notNull().unique(),
    avatarUrl: text("avatar_url"),

    // H3 index for the user's primary location
    h3Index: text("h3_index"),
    locationName: text("location_name"),

    subjectExpertise: jsonb("subject_expertise").$type<string[]>().default([]),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("users_auth_idx").on(t.authId),
    index("users_h3_idx").on(t.h3Index),
  ]
);
