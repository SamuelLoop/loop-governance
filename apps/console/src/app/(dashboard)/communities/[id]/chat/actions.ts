"use server";

import { createServiceClient, createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export type Message = {
  id: string;
  content: string;
  channel: "community" | "quorum";
  created_at: string;
  author: { id: string; display_name: string; email: string; avatar_url: string | null } | null;
  referenced_message: {
    id: string;
    content: string;
    author: { display_name: string } | null;
  } | null;
  metadata: {
    reference?: {
      type: string;
      id: string;
      title: string;
      subtitle?: string;
      url: string;
    };
  } | null;
};

export async function getMessages(
  communityId: string,
  channel?: "community" | "quorum"
): Promise<Message[]> {
  const admin = createServiceClient();

  let query = admin
    .from("messages")
    .select(
      `id, content, channel, created_at, referenced_message_id, metadata,
      author:users!messages_author_id_fkey(id, display_name, email, avatar_url)`
    )
    .eq("community_id", communityId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (channel) {
    query = query.eq("channel", channel);
  }

  const { data } = await query;
  if (!data || data.length === 0) return [];

  const refIds = data
    .map((m: any) => m.referenced_message_id)
    .filter(Boolean) as string[];

  let refMap: Record<string, any> = {};
  if (refIds.length > 0) {
    const { data: refs } = await admin
      .from("messages")
      .select(`id, content, author:users!messages_author_id_fkey(display_name)`)
      .in("id", refIds);
    if (refs) {
      for (const r of refs) {
        refMap[r.id] = r;
      }
    }
  }

  return data.map((m: any) => ({
    id: m.id,
    content: m.content,
    channel: m.channel,
    created_at: m.created_at,
    author: m.author,
    referenced_message: m.referenced_message_id
      ? refMap[m.referenced_message_id] ?? null
      : null,
    metadata: m.metadata ?? null,
  }));
}

export async function sendMessage(
  _prev: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const communityId = formData.get("community_id") as string;
  const content = formData.get("content") as string;
  const channel = (formData.get("channel") as string) || "community";
  const referencedMessageId =
    (formData.get("referenced_message_id") as string) || null;
  const referenceJson = formData.get("reference") as string;

  if (!content?.trim()) return { error: "Message cannot be empty" };

  let metadata: any = null;
  if (referenceJson) {
    try {
      metadata = { reference: JSON.parse(referenceJson) };
    } catch {}
  }

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

  const { data: membership } = await admin
    .from("community_memberships")
    .select("role")
    .eq("user_id", profile.id)
    .eq("community_id", communityId)
    .single();

  if (!membership) return { error: "You must be a community member" };

  if (channel === "quorum" && !["quorum", "admin"].includes(membership.role)) {
    return { error: "Only leadership group members can post in the leaders channel" };
  }

  const { error } = await admin.from("messages").insert({
    community_id: communityId,
    author_id: profile.id,
    content: content.trim(),
    channel,
    referenced_message_id: referencedMessageId,
    metadata,
  });

  if (error) return { error: error.message };

  revalidatePath(`/communities/${communityId}/chat`);
  return { error: "" };
}
