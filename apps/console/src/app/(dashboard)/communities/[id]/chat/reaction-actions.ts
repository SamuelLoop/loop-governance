"use server";

import { createServiceClient, createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export type Reaction = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
};

export async function getReactions(
  messageIds: string[]
): Promise<Record<string, Reaction[]>> {
  if (messageIds.length === 0) return {};

  const admin = createServiceClient();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let myProfileId: string | null = null;
  if (user) {
    const { data: profile } = await admin
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .single();
    myProfileId = profile?.id ?? null;
  }

  const { data } = await admin
    .from("message_reactions")
    .select("message_id, emoji, user_id")
    .in("message_id", messageIds);

  const grouped: Record<string, Record<string, { count: number; mine: boolean }>> = {};
  for (const row of data ?? []) {
    grouped[row.message_id] ??= {};
    grouped[row.message_id][row.emoji] ??= { count: 0, mine: false };
    grouped[row.message_id][row.emoji].count += 1;
    if (myProfileId && row.user_id === myProfileId) {
      grouped[row.message_id][row.emoji].mine = true;
    }
  }

  const result: Record<string, Reaction[]> = {};
  for (const [messageId, emojiMap] of Object.entries(grouped)) {
    result[messageId] = Object.entries(emojiMap).map(([emoji, v]) => ({
      emoji,
      count: v.count,
      reactedByMe: v.mine,
    }));
  }
  return result;
}

export async function toggleReaction(
  _prev: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const messageId = formData.get("message_id") as string;
  const communityId = formData.get("community_id") as string;
  const emoji = formData.get("emoji") as string;

  if (!messageId || !emoji) return { error: "Missing message or emoji" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createServiceClient();
  const { data: profile } = await admin
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!profile) return { error: "No profile" };

  const { data: existing } = await admin
    .from("message_reactions")
    .select("id")
    .eq("message_id", messageId)
    .eq("user_id", profile.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    const { error } = await admin
      .from("message_reactions")
      .delete()
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await admin.from("message_reactions").insert({
      message_id: messageId,
      user_id: profile.id,
      emoji,
    });
    if (error) return { error: error.message };
  }

  revalidatePath(`/communities/${communityId}/chat`);
  // See actions.ts's sendMessage for why: this same action now also
  // runs from the dashboard's embedded full-chat view.
  revalidatePath("/");
  return { error: "" };
}
