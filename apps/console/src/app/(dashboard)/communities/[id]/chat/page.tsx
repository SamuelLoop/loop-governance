import { createClient, createServiceClient } from "@/lib/supabase-server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { getMessages } from "./actions";
import { getQuestions } from "./question-actions";
import { DualChatPanel } from "./dual-chat-panel";
import { QuestionPanel } from "./question-panel";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const admin = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: community } = await admin
    .from("communities")
    .select("id, name, subject")
    .eq("id", id)
    .single();
  if (!community) notFound();

  const { data: profile } = await admin
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  const { data: membership } = profile
    ? await admin
        .from("community_memberships")
        .select("role")
        .eq("user_id", profile.id)
        .eq("community_id", id)
        .single()
    : { data: null };

  if (!membership) redirect(`/communities/${id}`);

  const isQuorum = ["quorum", "admin"].includes(membership.role);

  const [communityMessages, quorumMessages, questions] = await Promise.all([
    getMessages(id, "community"),
    getMessages(id, "quorum"),
    getQuestions(id),
  ]);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex items-center border-b px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={`/communities/${id}`} />}
        >
          <ChevronLeft className="h-3 w-3" />
        </Button>
        <div className="ml-3">
          <h1 className="text-sm font-medium">{community.name}</h1>
          <p className="text-xs text-muted-foreground">
            Community + Quorum (glass room) + Questions
          </p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat panels take 2/3 */}
        <div className="flex flex-[2] overflow-hidden">
          <DualChatPanel
            communityId={id}
            communityMessages={communityMessages}
            quorumMessages={quorumMessages}
            isQuorum={isQuorum}
          />
        </div>
        {/* Question panel takes 1/3 */}
        <div className="flex w-80 shrink-0 flex-col border-l">
          <QuestionPanel
            communityId={id}
            questions={questions}
            isQuorum={isQuorum}
          />
        </div>
      </div>
    </div>
  );
}
