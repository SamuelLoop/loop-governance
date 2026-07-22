"use client";

import { useState } from "react";
import { Users, Shield, HelpCircle } from "lucide-react";
import { ThreadPanel } from "./dual-chat-panel";
import { QuestionPanel } from "./question-panel";
import type { Message } from "./actions";
import type { Question } from "./question-actions";

type Tab = "community" | "quorum" | "questions";

export function ChatMobileLayout({
  communityId,
  communityMessages,
  quorumMessages,
  questions,
  isQuorum,
}: {
  communityId: string;
  communityMessages: Message[];
  quorumMessages: Message[];
  questions: Question[];
  isQuorum: boolean;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("community");
  const [referencedMsg, setReferencedMsg] = useState<Message | null>(null);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "community", label: "Chat", icon: <Users className="h-4 w-4" /> },
    { id: "quorum", label: "Quorum", icon: <Shield className="h-4 w-4" /> },
    { id: "questions", label: "Questions", icon: <HelpCircle className="h-4 w-4" /> },
  ];

  return (
    <div className="flex flex-1 flex-col overflow-hidden md:hidden">
      <div className="flex border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-medium transition ${
              activeTab === tab.id
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {activeTab === "community" && (
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
        )}
        {activeTab === "quorum" && (
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
        )}
        {activeTab === "questions" && (
          <QuestionPanel
            communityId={communityId}
            questions={questions}
            isQuorum={isQuorum}
          />
        )}
      </div>
    </div>
  );
}
