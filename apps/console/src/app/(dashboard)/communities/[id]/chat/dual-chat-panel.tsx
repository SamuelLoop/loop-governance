"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { sendMessage, type Message } from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquareQuote, Send, X, Shield, Users, Link2, FileText, Vote, Megaphone, Coins, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function MessageBubble({
  message,
  onReference,
}: {
  message: Message;
  onReference: (msg: Message) => void;
}) {
  return (
    <div className="group flex gap-2 px-3 py-1.5 hover:bg-accent/30">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-[10px] font-medium">
        {message.author?.avatar_url ? (
          <img src={message.author.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          (message.author?.display_name ?? "?")[0].toUpperCase()
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-medium">
            {message.author?.display_name ?? "Unknown"}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <button
            onClick={() => onReference(message)}
            className="ml-auto text-muted-foreground md:opacity-0 md:transition md:group-hover:opacity-100"
            title="Reference in your message"
          >
            <MessageSquareQuote className="h-4 w-4 md:h-3 md:w-3" />
          </button>
        </div>

        {message.referenced_message && (
          <div className="mt-1 rounded border-l-2 border-primary/40 bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground">
            <span className="font-medium">
              {(message.referenced_message as any).author?.display_name ??
                "Unknown"}
              :
            </span>{" "}
            {(message.referenced_message as any).content?.slice(0, 100)}
            {((message.referenced_message as any).content?.length ?? 0) > 100
              ? "..."
              : ""}
          </div>
        )}

        <p className="mt-0.5 text-sm whitespace-pre-wrap break-words">
          {message.content}
        </p>

        {message.metadata?.reference && (
          <a
            href={message.metadata.reference.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-2 py-1.5 transition hover:border-primary/40"
          >
            {message.metadata.reference.type === "proposal" && <FileText className="h-3 w-3 text-blue-400" />}
            {message.metadata.reference.type === "election" && <Vote className="h-3 w-3 text-purple-400" />}
            {message.metadata.reference.type === "campaign" && <Megaphone className="h-3 w-3 text-amber-400" />}
            {message.metadata.reference.type === "treasury" && <Coins className="h-3 w-3 text-green-400" />}
            {message.metadata.reference.type === "power" && <Star className="h-3 w-3 text-red-400" />}
            <span className="truncate text-[10px] font-medium">{message.metadata.reference.title}</span>
            <Badge variant="outline" className="shrink-0 text-[7px]">{message.metadata.reference.type}</Badge>
          </a>
        )}
      </div>
    </div>
  );
}

export function ThreadPanel({
  title,
  icon,
  messages,
  communityId,
  channel,
  canPost,
  onReference,
  referencedMsg,
  clearReference,
}: {
  title: string;
  icon: React.ReactNode;
  messages: Message[];
  communityId: string;
  channel: "community" | "quorum";
  canPost: boolean;
  onReference: (msg: Message) => void;
  referencedMsg: Message | null;
  clearReference: () => void;
}) {
  const [state, action] = useActionState(sendMessage, { error: "" });
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
      clearReference();
    }
  }, [state]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden border-r last:border-r-0">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        {icon}
        <span className="text-xs font-medium">{title}</span>
        <span className="text-[10px] text-muted-foreground">
          ({messages.length})
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto py-1">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4">
            <p className="text-center text-xs text-muted-foreground">
              No messages yet
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} onReference={onReference} />
          ))
        )}
      </div>

      {canPost && (
        <div className="border-t px-3 py-2">
          {referencedMsg && referencedMsg.channel !== channel && (
            <div className="mb-1.5 flex items-center gap-1.5 rounded border border-primary/30 bg-primary/5 px-2 py-1 text-[10px]">
              <MessageSquareQuote className="h-2.5 w-2.5 text-primary" />
              <span className="flex-1 truncate text-muted-foreground">
                {referencedMsg.author?.display_name}:{" "}
                {referencedMsg.content.slice(0, 40)}
              </span>
              <button
                onClick={clearReference}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          )}

          {state.error && (
            <div className="mb-1 text-[10px] text-destructive">
              {state.error}
            </div>
          )}

          <form ref={formRef} action={action} className="flex gap-1.5">
            <input type="hidden" name="community_id" value={communityId} />
            <input type="hidden" name="channel" value={channel} />
            {referencedMsg && referencedMsg.channel !== channel && (
              <input
                type="hidden"
                name="referenced_message_id"
                value={referencedMsg.id}
              />
            )}
            <Textarea
              name="content"
              placeholder={
                channel === "quorum" ? "Quorum message..." : "Message..."
              }
              rows={1}
              className="min-h-[32px] flex-1 resize-none text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  formRef.current?.requestSubmit();
                }
              }}
            />
            <Button type="submit" size="sm" className="h-10 w-10 p-0 md:h-8 md:w-8">
              <Send className="h-4 w-4 md:h-3 md:w-3" />
            </Button>
          </form>
        </div>
      )}

      {!canPost && (
        <div className="border-t px-3 py-2 text-center text-[10px] text-muted-foreground">
          Only quorum members can post here
        </div>
      )}
    </div>
  );
}

export function DualChatPanel({
  communityId,
  communityMessages,
  quorumMessages,
  isQuorum,
}: {
  communityId: string;
  communityMessages: Message[];
  quorumMessages: Message[];
  isQuorum: boolean;
}) {
  const [referencedMsg, setReferencedMsg] = useState<Message | null>(null);

  return (
    <div className="flex flex-1 overflow-hidden">
      <ThreadPanel
        title="Community"
        icon={<Users className="h-3.5 w-3.5 text-muted-foreground" />}
        messages={communityMessages}
        communityId={communityId}
        channel="community"
        canPost={true}
        onReference={setReferencedMsg}
        referencedMsg={referencedMsg}
        clearReference={() => setReferencedMsg(null)}
      />
      <ThreadPanel
        title="Quorum"
        icon={<Shield className="h-3.5 w-3.5 text-primary" />}
        messages={quorumMessages}
        communityId={communityId}
        channel="quorum"
        canPost={isQuorum}
        onReference={setReferencedMsg}
        referencedMsg={referencedMsg}
        clearReference={() => setReferencedMsg(null)}
      />
    </div>
  );
}
