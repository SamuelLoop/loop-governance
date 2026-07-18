import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { communities } from "./communities";

// Configurable enrollment funnels per community (the "suitcase" pattern)
export const enrollmentFunnels = pgTable(
  "enrollment_funnels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),

    slug: text("slug").notNull(),
    active: boolean("active").notNull().default(true),

    // Step configuration: what fields to collect, what questions to ask
    steps: jsonb("steps")
      .$type<
        Array<{
          type: "welcome" | "details" | "questions" | "story" | "confirm";
          title: string;
          content?: string;
          fields?: Array<{
            name: string;
            label: string;
            type: "text" | "email" | "phone" | "select" | "location";
            required: boolean;
            options?: string[];
          }>;
        }>
      >()
      .notNull(),

    // Branding overrides
    theme: jsonb("theme")
      .$type<{
        primaryColor?: string;
        accentColor?: string;
        logoUrl?: string;
        backgroundUrl?: string;
      }>()
      .default({}),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("funnel_community_idx").on(t.communityId)]
);
