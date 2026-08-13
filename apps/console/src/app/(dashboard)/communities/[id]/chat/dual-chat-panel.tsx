"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { sendMessage, type Message } from "./actions";
import { toggleReaction, type Reaction } from "./reaction-actions";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquareQuote, Send, X, Shield, Users, Link2, FileText, Vote, Megaphone, Coins, Star, Smile } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Glass, LiveDot } from "@loop/ui";

const QUICK_EMOJI = [
  "👍", "👎", "❤️", "🎉", "😂", "😮", "😢", "🙏",
  "🔥", "✅", "👀", "💯", "🤔", "👏", "🚀", "😅",
  "😍", "🙌", "🤝", "💡", "⚡", "🎯", "🏆", "☕",
];

function ReactionBar({
  messageId,
  communityId,
  reactions,
}: {
  messageId: string;
  communityId: string;
  reactions: Reaction[];
}) {
  const [, action] = useActionState(toggleReaction, { error: "" });
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {reactions.map((r) => (
        <form key={r.emoji} action={action}>
          <input type="hidden" name="message_id" value={messageId} />
          <input type="hidden" name="community_id" value={communityId} />
          <input type="hidden" name="emoji" value={r.emoji} />
          <button
            type="submit"
            className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[10px] transition ${
              r.reactedByMe
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            <span>{r.emoji}</span>
            <span>{r.count}</span>
          </button>
        </form>
      ))}

      <div className="relative">
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className="flex h-5 w-5 items-center justify-center rounded-md border border-border text-[11px] text-muted-foreground transition hover:border-primary/50 hover:text-primary"
          aria-label="Add or change reaction"
        >
          +
        </button>
        {pickerOpen && (
          <div className="absolute bottom-full left-0 z-10 mb-1 grid w-[176px] grid-cols-6 gap-0.5 rounded-lg border border-surface-border bg-popover p-1.5 shadow-lg">
            {QUICK_EMOJI.map((emoji) => (
              <form
                key={emoji}
                action={action}
                onSubmit={() => setPickerOpen(false)}
              >
                <input type="hidden" name="message_id" value={messageId} />
                <input type="hidden" name="community_id" value={communityId} />
                <input type="hidden" name="emoji" value={emoji} />
                <button
                  type="submit"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-base hover:bg-accent"
                >
                  {emoji}
                </button>
              </form>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  onReference,
  communityId,
  reactions,
}: {
  message: Message;
  onReference: (msg: Message) => void;
  communityId: string;
  reactions: Reaction[];
}) {
  return (
    <div className="group flex gap-2 px-3 py-1.5 hover:bg-accent/30">
      <Avatar size="sm" className="shrink-0">
        <AvatarImage src={message.author?.avatar_url ?? undefined} alt="" />
        <AvatarFallback className="text-[10px] font-medium">
          {(message.author?.display_name ?? "?")[0].toUpperCase()}
        </AvatarFallback>
      </Avatar>
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

        <ReactionBar
          messageId={message.id}
          communityId={communityId}
          reactions={reactions}
        />
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
  reactionsByMessage,
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
  reactionsByMessage: Record<string, Reaction[]>;
}) {
  const [state, action] = useActionState(sendMessage, { error: "" });
  const scrollRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [showEmoji, setShowEmoji] = useState(false);

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

  function insertEmoji(emoji: string) {
    const textarea = formRef.current?.querySelector<HTMLTextAreaElement>(
      "textarea[name=content]"
    );
    if (textarea) {
      textarea.value += emoji;
      textarea.focus();
    }
    setShowEmoji(false);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        {icon}
        <span className="text-xs font-medium">{title}</span>
        {channel === "quorum" && (
          <span className="rounded-full border border-[color-mix(in_srgb,var(--accent-end)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent-end)_10%,transparent)] px-2 py-0.5 font-mono text-[9px] tracking-wide text-[color:var(--accent-end)] uppercase">
            Members only
          </span>
        )}
        <span className="text-[10px] text-muted-foreground">
          ({messages.length})
        </span>
        <LiveDot className="ml-auto" title="Live" />
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
            <MessageBubble
              key={msg.id}
              message={msg}
              onReference={onReference}
              communityId={communityId}
              reactions={reactionsByMessage[msg.id] ?? []}
            />
          ))
        )}
      </div>

      {canPost && (
        <div className="relative border-t px-3 py-2">
          {showEmoji && (
            <div className="absolute bottom-full left-3 z-10 mb-1 grid w-[176px] grid-cols-6 gap-0.5 rounded-lg border border-surface-border bg-popover p-1.5 shadow-lg">
              {QUICK_EMOJI.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insertEmoji(emoji)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-base hover:bg-accent"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

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
            <button
              type="button"
              onClick={() => setShowEmoji((v) => !v)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-input text-muted-foreground hover:border-primary/50 hover:text-primary md:h-8 md:w-8"
              aria-label="Insert emoji"
            >
              <Smile className="h-4 w-4 md:h-3 md:w-3" />
            </button>
            <Textarea
              name="content"
              placeholder={
                channel === "quorum" ? "Leadership group message..." : "Message..."
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
            <Button
              type="submit"
              size="sm"
              className="h-10 w-10 border-transparent bg-[image:linear-gradient(90deg,var(--accent-start),var(--accent-end))] p-0 text-white hover:opacity-90 md:h-8 md:w-8"
            >
              <Send className="h-4 w-4 md:h-3 md:w-3" />
            </Button>
          </form>
        </div>
      )}

      {!canPost && (
        <div className="border-t px-3 py-2 text-center text-[10px] text-muted-foreground">
          Only leadership group members can post here
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
  communityReactions,
  quorumReactions,
}: {
  communityId: string;
  communityMessages: Message[];
  quorumMessages: Message[];
  isQuorum: boolean;
  communityReactions: Record<string, Reaction[]>;
  quorumReactions: Record<string, Reaction[]>;
}) {
  const [referencedMsg, setReferencedMsg] = useState<Message | null>(null);

  return (
    <div className="flex flex-1 gap-3 overflow-hidden">
      <Glass space="community" className="flex flex-1 flex-col overflow-hidden">
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
          reactionsByMessage={communityReactions}
        />
      </Glass>
      <Glass space="leadership" className="flex flex-1 flex-col overflow-hidden">
        <ThreadPanel
          title="Leadership group"
          icon={<Shield className="h-3.5 w-3.5 text-primary" />}
          messages={quorumMessages}
          communityId={communityId}
          channel="quorum"
          canPost={isQuorum}
          onReference={setReferencedMsg}
          referencedMsg={referencedMsg}
          clearReference={() => setReferencedMsg(null)}
          reactionsByMessage={quorumReactions}
        />
      </Glass>
    </div>
  );
}
