"use client";

import { useActionState, useRef, useEffect, useLayoutEffect } from "react";
import {
  submitQuestion,
  upvoteQuestion,
  markQuestionDiscussing,
  type Question,
} from "./question-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, MessageCircle, HelpCircle } from "lucide-react";

function QuestionCard({
  question,
  communityId,
  isQuorum,
  rank,
  cardRef,
}: {
  question: Question;
  communityId: string;
  isQuorum: boolean;
  rank: number;
  cardRef: (el: HTMLDivElement | null) => void;
}) {
  const [, upvoteAction] = useActionState(upvoteQuestion, { error: "" });
  const [, discussAction] = useActionState(markQuestionDiscussing, {
    error: "",
  });

  return (
    <div ref={cardRef} className="flex gap-2 rounded-lg border bg-card p-3">
      <span className="w-4 pt-1 text-center font-mono text-xs font-bold text-muted-foreground tabular-nums">
        {rank}
      </span>
      {/* Upvote */}
      <form action={upvoteAction} className="flex flex-col items-center">
        <input type="hidden" name="question_id" value={question.id} />
        <input type="hidden" name="community_id" value={communityId} />
        <button
          type="submit"
          className={`flex h-8 w-8 items-center justify-center rounded-md border transition ${
            question.user_has_upvoted
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
          }`}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </button>
        <span className="mt-0.5 text-xs font-medium tabular-nums">
          {question.upvote_count}
        </span>
      </form>

      {/* Question content */}
      <div className="min-w-0 flex-1">
        <p className="text-sm">{question.question}</p>
        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>{question.author?.display_name ?? "Unknown"}</span>
          <span>
            {new Date(question.created_at).toLocaleDateString()}
          </span>
          {question.status === "discussing" && (
            <Badge variant="default" className="px-1 py-0 text-[9px]">
              discussing
            </Badge>
          )}
        </div>
      </div>

      {/* Quorum action */}
      {isQuorum && question.status === "open" && (
        <form action={discussAction} className="flex items-start">
          <input type="hidden" name="question_id" value={question.id} />
          <input type="hidden" name="community_id" value={communityId} />
          <Button variant="outline" size="sm" type="submit" className="h-7 text-[10px]">
            <MessageCircle className="mr-1 h-3 w-3" />
            Discuss
          </Button>
        </form>
      )}
    </div>
  );
}

export function QuestionPanel({
  communityId,
  questions,
  isQuorum,
}: {
  communityId: string;
  questions: Question[];
  isQuorum: boolean;
}) {
  const [state, action] = useActionState(submitQuestion, { error: "" });
  const formRef = useRef<HTMLFormElement>(null);
  const cardEls = useRef<Map<string, HTMLDivElement>>(new Map());
  const prevRects = useRef<Map<string, DOMRect>>(new Map());

  useEffect(() => {
    if (!state.error && formRef.current) {
      formRef.current.reset();
    }
  }, [state]);

  // Live re-rank: when the server-sorted `questions` order changes (a vote
  // landed), FLIP-animate each card from its previous position to its new
  // one instead of just snapping — makes the "this is a ranked queue, not
  // a feed" distinction visible, not just implied by the layout.
  useLayoutEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const nextRects = new Map<string, DOMRect>();
    cardEls.current.forEach((el, id) => {
      nextRects.set(id, el.getBoundingClientRect());
    });

    if (!reduceMotion) {
      questions.forEach((q) => {
        const el = cardEls.current.get(q.id);
        const prev = prevRects.current.get(q.id);
        const next = nextRects.get(q.id);
        if (!el || !prev || !next) return;
        const deltaY = prev.top - next.top;
        if (deltaY === 0) return;
        el.style.transition = "none";
        el.style.transform = `translateY(${deltaY}px)`;
        requestAnimationFrame(() => {
          el.style.transition = "transform 400ms ease-out";
          el.style.transform = "";
        });
      });
    }

    prevRects.current = nextRects;
  }, [questions]);

  return (
    <div className="flex h-full flex-col rounded-panel border border-surface-border bg-surface backdrop-blur-[var(--blur-glass)]">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <HelpCircle className="h-3.5 w-3.5 text-warning" />
        <span className="text-xs font-medium">
          Questions for leaders
        </span>
        <span className="text-[10px] text-muted-foreground">
          ({questions.length})
        </span>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {questions.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-xs text-muted-foreground">
              No questions yet. Ask the leadership team something.
            </p>
          </div>
        ) : (
          questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              question={q}
              communityId={communityId}
              isQuorum={isQuorum}
              rank={i + 1}
              cardRef={(el) => {
                if (el) cardEls.current.set(q.id, el);
                else cardEls.current.delete(q.id);
              }}
            />
          ))
        )}
      </div>

      {/* Submit question */}
      <div className="border-t px-3 py-2">
        {state.error && (
          <div className="mb-1 text-[10px] text-destructive">
            {state.error}
          </div>
        )}
        <form ref={formRef} action={action} className="flex gap-1.5">
          <input type="hidden" name="community_id" value={communityId} />
          <Textarea
            name="question"
            placeholder="Pose a question to the leadership..."
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
            <HelpCircle className="h-4 w-4 md:h-3 md:w-3" />
          </Button>
        </form>
      </div>
    </div>
  );
}
