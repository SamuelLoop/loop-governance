"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, MessageSquare, Users, ExternalLink } from "lucide-react";

type Message = {
  id: string;
  content: string;
  channel: "community" | "quorum";
  created_at: string;
  community_name: string;
  author: { id: string; display_name: string } | null;
};

type Community = {
  id: string;
  name: string;
  level: string;
};

export function DashboardChat({
  communities,
  initialMessages,
  initialCommunityId,
  sendMessageAction,
}: {
  communities: Community[];
  initialMessages: Message[];
  initialCommunityId: string | null;
  sendMessageAction: (
    prev: { error: string },
    formData: FormData
  ) => Promise<{ error: string }>;
}) {
  const [activeCommunityId, setActiveCommunityId] = useState(
    initialCommunityId
  );
  const [messages, setMessages] = useState(initialMessages);
  const [state, action] = useActionState(sendMessageAction, { error: "" });
  const scrollRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!state.error && formRef.current) {
      formRef.current.reset();
    }
  }, [state]);

  const activeCommunity = communities.find((c) => c.id === activeCommunityId);

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col rounded-lg border bg-card">
      {/* Community selector */}
      <div className="flex items-center gap-2 overflow-x-auto border-b px-4 py-3">
        <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="shrink-0 text-xs font-medium text-muted-foreground">
          Conversations:
        </span>
        <div className="flex gap-1.5">
          {communities.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCommunityId(c.id)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                activeCommunityId === c.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
        {activeCommunity && (
          <a
            href={`/communities/${activeCommunityId}/chat`}
            className="ml-auto flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
          >
            Full chat <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-2">
        {!activeCommunityId ? (
          <div className="flex h-full items-center justify-center px-4">
            <div className="text-center">
              <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Select a community above to join the conversation
              </p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4">
            <p className="text-sm text-muted-foreground">
              No messages yet. Start the conversation.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className="group flex gap-2.5 px-4 py-1.5 hover:bg-accent/30"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {(msg.author?.display_name ?? "?")[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-medium">
                    {msg.author?.display_name ?? "Unknown"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {msg.channel === "quorum" && (
                    <Badge variant="default" className="px-1 py-0 text-[9px]">
                      leader
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">
                  {msg.content}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Message input */}
      {activeCommunityId && (
        <div className="border-t px-4 py-3">
          {state.error && (
            <div className="mb-2 text-xs text-destructive">{state.error}</div>
          )}
          <form ref={formRef} action={action} className="flex gap-2">
            <input
              type="hidden"
              name="community_id"
              value={activeCommunityId}
            />
            <input type="hidden" name="channel" value="community" />
            <Textarea
              name="content"
              placeholder={`Message ${activeCommunity?.name ?? ""}...`}
              rows={1}
              className="min-h-[36px] flex-1 resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  formRef.current?.requestSubmit();
                }
              }}
            />
            <Button type="submit" size="sm" className="self-end">
              <Send className="h-3 w-3" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
