"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { sendMessage, type Message } from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquareQuote, Send, X, Shield } from "lucide-react";

function MessageBubble({
  message,
  onReference,
}: {
  message: Message;
  onReference: (msg: Message) => void;
}) {
  const isQuorumMsg = message.channel === "quorum";

  return (
    <div
      className={`group flex gap-3 px-4 py-2 hover:bg-accent/30 ${
        isQuorumMsg ? "border-l-2 border-primary/60 bg-primary/5" : ""
      }`}
    >
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
          isQuorumMsg ? "bg-primary/20 text-primary" : "bg-muted"
        }`}
      >
        {isQuorumMsg ? (
          <Shield className="h-3 w-3" />
        ) : (
          (message.author?.display_name ?? "?")[0].toUpperCase()
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-medium">
            {message.author?.display_name ?? "Unknown"}
          </span>
          {isQuorumMsg && (
            <Badge variant="default" className="text-[9px] px-1 py-0">
              quorum
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground">
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <button
            onClick={() => onReference(message)}
            className="ml-auto hidden text-muted-foreground opacity-0 transition group-hover:inline-flex group-hover:opacity-100 hover:text-primary"
            title="Reference this message"
          >
            <MessageSquareQuote className="h-3 w-3" />
          </button>
        </div>

        {message.referenced_message && (
          <div className="mt-1 rounded border-l-2 border-primary/40 bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
            <span className="font-medium">
              {(message.referenced_message as any).author?.display_name ??
                "Unknown"}
              :
            </span>{" "}
            {(message.referenced_message as any).content?.slice(0, 120)}
            {((message.referenced_message as any).content?.length ?? 0) > 120
              ? "..."
              : ""}
          </div>
        )}

        <p className="mt-0.5 text-sm whitespace-pre-wrap break-words">
          {message.content}
        </p>
      </div>
    </div>
  );
}

export function ChatPanel({
  communityId,
  messages,
  isQuorum,
}: {
  communityId: string;
  messages: Message[];
  isQuorum: boolean;
}) {
  const [state, action] = useActionState(sendMessage, { error: "" });
  const [referencedMsg, setReferencedMsg] = useState<Message | null>(null);
  const [postChannel, setPostChannel] = useState<"community" | "quorum">(
    "community"
  );
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
      setReferencedMsg(null);
    }
  }, [state]);

  return (
    <>
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-2">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No messages yet. Start the conversation.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onReference={setReferencedMsg}
            />
          ))
        )}
      </div>

      <div className="border-t px-4 py-3">
        {referencedMsg && (
          <div className="mb-2 flex items-center gap-2 rounded border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs">
            <MessageSquareQuote className="h-3 w-3 text-primary" />
            <span className="flex-1 truncate text-muted-foreground">
              Referencing{" "}
              {referencedMsg.channel === "quorum" ? "(quorum) " : ""}
              {referencedMsg.author?.display_name}:{" "}
              {referencedMsg.content.slice(0, 60)}
            </span>
            <button
              onClick={() => setReferencedMsg(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {state.error && (
          <div className="mb-2 text-xs text-destructive">{state.error}</div>
        )}

        <form ref={formRef} action={action} className="flex gap-2">
          <input type="hidden" name="community_id" value={communityId} />
          <input type="hidden" name="channel" value={postChannel} />
          {referencedMsg && (
            <input
              type="hidden"
              name="referenced_message_id"
              value={referencedMsg.id}
            />
          )}
          <div className="flex flex-1 flex-col gap-1">
            {isQuorum && (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setPostChannel("community")}
                  className={`rounded px-2 py-0.5 text-[10px] font-medium transition ${
                    postChannel === "community"
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Community
                </button>
                <button
                  type="button"
                  onClick={() => setPostChannel("quorum")}
                  className={`rounded px-2 py-0.5 text-[10px] font-medium transition ${
                    postChannel === "quorum"
                      ? "bg-primary/20 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Quorum
                </button>
              </div>
            )}
            <Textarea
              name="content"
              placeholder={
                postChannel === "quorum"
                  ? "Post to quorum channel..."
                  : "Message the community..."
              }
              rows={1}
              className="min-h-[36px] resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  formRef.current?.requestSubmit();
                }
              }}
            />
          </div>
          <Button type="submit" size="sm" className="self-end">
            <Send className="h-3 w-3" />
          </Button>
        </form>
      </div>
    </>
  );
}
