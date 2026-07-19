import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const messageChannels = ["community", "quorum"] as const;
export type MessageChannel = (typeof messageChannels)[number];

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    communityId: uuid("community_id").notNull(),
    authorId: uuid("author_id").notNull(),
    content: text("content").notNull(),
    channel: text("channel", { enum: messageChannels }).notNull().default("community"),
    referencedMessageId: uuid("referenced_message_id"),
    proposalId: uuid("proposal_id"),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("messages_community_channel_idx").on(
      t.communityId,
      t.channel,
      t.createdAt
    ),
    index("messages_author_idx").on(t.authorId),
  ]
);
