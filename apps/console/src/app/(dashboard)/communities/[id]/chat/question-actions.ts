"use server";

import { createServiceClient, createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export type Question = {
  id: string;
  question: string;
  status: "open" | "answered" | "discussing";
  upvote_count: number;
  created_at: string;
  answered_at: string | null;
  answer_summary: string | null;
  author: { id: string; display_name: string } | null;
  user_has_upvoted: boolean;
};

export async function getQuestions(communityId: string): Promise<Question[]> {
  const admin = createServiceClient();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await admin
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .single()
    : { data: null };

  const { data: questions } = await admin
    .from("community_questions")
    .select(
      `id, question, status, upvote_count, created_at, answered_at, answer_summary,
      author:users!community_questions_author_id_fkey(id, display_name)`
    )
    .eq("community_id", communityId)
    .eq("status", "open")
    .order("upvote_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (!questions) return [];

  let upvotedIds = new Set<string>();
  if (profile) {
    const { data: upvotes } = await admin
      .from("question_upvotes")
      .select("question_id")
      .eq("user_id", profile.id)
      .in(
        "question_id",
        questions.map((q: any) => q.id)
      );
    upvotedIds = new Set((upvotes ?? []).map((u: any) => u.question_id));
  }

  return questions.map((q: any) => ({
    ...q,
    user_has_upvoted: upvotedIds.has(q.id),
  }));
}

export async function submitQuestion(
  _prev: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const communityId = formData.get("community_id") as string;
  const question = (formData.get("question") as string)?.trim();

  if (!question) return { error: "Question cannot be empty" };

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

  const { error } = await admin.from("community_questions").insert({
    community_id: communityId,
    author_id: profile.id,
    question,
  });

  if (error) return { error: error.message };

  revalidatePath(`/communities/${communityId}/chat`);
  return { error: "" };
}

export async function upvoteQuestion(
  _prev: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const questionId = formData.get("question_id") as string;
  const communityId = formData.get("community_id") as string;

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
    .from("question_upvotes")
    .select("question_id")
    .eq("question_id", questionId)
    .eq("user_id", profile.id)
    .single();

  if (existing) {
    await admin
      .from("question_upvotes")
      .delete()
      .eq("question_id", questionId)
      .eq("user_id", profile.id);
  } else {
    await admin.from("question_upvotes").insert({
      question_id: questionId,
      user_id: profile.id,
    });
  }

  // Fallback: count upvotes directly
  const { count } = await admin
    .from("question_upvotes")
    .select("*", { count: "exact", head: true })
    .eq("question_id", questionId);

  await admin
    .from("community_questions")
    .update({ upvote_count: count ?? 0 })
    .eq("id", questionId);

  revalidatePath(`/communities/${communityId}/chat`);
  return { error: "" };
}

export async function markQuestionDiscussing(
  _prev: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const questionId = formData.get("question_id") as string;
  const communityId = formData.get("community_id") as string;

  const admin = createServiceClient();
  await admin
    .from("community_questions")
    .update({ status: "discussing" })
    .eq("id", questionId);

  revalidatePath(`/communities/${communityId}/chat`);
  return { error: "" };
}
