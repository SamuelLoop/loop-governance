"use client";

import { useState, useEffect, type ReactElement } from "react";
import { createClient } from "@/lib/supabase-browser";
import { Glass } from "@loop/ui";

export function AdminPanel(): ReactElement {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    aiUsers: number;
    totalUsers: number;
    totalMessages: number;
    totalDelegations: number;
  } | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAdmin() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const { data: profile } = await supabase
        .from("users")
        .select("platform_role")
        .eq("auth_id", user.id)
        .single();
      setIsAdmin(profile?.platform_role === "platform_admin");

      // Fetch stats
      const { count: aiUsers } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("is_ai", true);
      const { count: totalUsers } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true });
      const { count: totalMessages } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true });
      const { count: totalDelegations } = await supabase
        .from("delegations")
        .select("*", { count: "exact", head: true })
        .eq("active", true);

      setStats({
        aiUsers: aiUsers || 0,
        totalUsers: totalUsers || 0,
        totalMessages: totalMessages || 0,
        totalDelegations: totalDelegations || 0,
      });
    }
    checkAdmin();
  }, []);

  async function activateAI() {
    setLoading(true);
    setError(null);
    setResult(null);

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setError("Not logged in");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/ai-activate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
      } else {
        setResult(data);
        // Refresh stats
        const { count: totalMessages } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true });
        const { count: totalDelegations } = await supabase
          .from("delegations")
          .select("*", { count: "exact", head: true })
          .eq("active", true);
        setStats((s) =>
          s
            ? {
                ...s,
                totalMessages: totalMessages || 0,
                totalDelegations: totalDelegations || 0,
              }
            : s
        );
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  if (isAdmin === null) {
    return (
      <p className="text-sm text-text-secondary">Checking permissions...</p>
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-error/20 bg-error/5 p-6 text-center">
        <p className="text-sm text-error">
          You must be logged in as a platform admin to access this page.
        </p>
        <a
          href="https://console.loopcmbntr.live/login"
          className="mt-3 inline-block text-xs text-text-secondary underline hover:text-text-primary"
        >
          Sign in
        </a>
      </div>
    );
  }

  // Everything below is genuinely platform_admin-only (checked above,
  // not just named like an admin surface) — gets space="admin" per
  // session 08/10's rule: only tint where a real, already-coded
  // restriction exists.
  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Glass space="admin" className="p-4 text-center">
            <p className="text-2xl font-bold text-warning">
              {stats.aiUsers.toLocaleString()}
            </p>
            <p className="text-xs text-text-secondary">AI experts</p>
          </Glass>
          <Glass space="admin" className="p-4 text-center">
            <p className="text-2xl font-bold text-text-primary">
              {stats.totalUsers.toLocaleString()}
            </p>
            <p className="text-xs text-text-secondary">Total users</p>
          </Glass>
          <Glass space="admin" className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">
              {stats.totalMessages.toLocaleString()}
            </p>
            <p className="text-xs text-text-secondary">Messages</p>
          </Glass>
          <Glass space="admin" className="p-4 text-center">
            <p className="text-2xl font-bold text-success">
              {stats.totalDelegations.toLocaleString()}
            </p>
            <p className="text-xs text-text-secondary">Delegations</p>
          </Glass>
        </div>
      )}

      {/* Activate AI */}
      <Glass space="admin" className="p-6">
        <h2 className="mb-2 text-lg font-semibold text-text-primary">
          Activate AI Experts
        </h2>
        <p className="mb-4 text-sm text-text-secondary">
          Each AI expert posts a message in one of their enrolled communities
          and delegates their vote to a human user in a shared community. Human
          users receive an email notification about the delegation.
        </p>

        <button
          onClick={activateAI}
          disabled={loading}
          className="rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-[var(--accent-glow)] transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: "var(--accent-gradient)" }}
        >
          {loading ? "Activating..." : "Activate AI Experts"}
        </button>

        {error && (
          <div className="mt-4 rounded-lg border border-error/20 bg-error/5 p-3 text-sm text-error">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-4 space-y-2 rounded-lg border border-success/20 bg-success/5 p-4">
            <p className="text-sm font-medium text-success">
              Activation complete
            </p>
            <p className="text-xs text-text-secondary">{result.summary}</p>
            {result.humansNotified > 0 && (
              <p className="text-xs text-text-secondary">
                {result.humansNotified} human users received vote delegations
                from AI experts.
              </p>
            )}
          </div>
        )}
      </Glass>

      {/* Info */}
      <Glass space="admin" className="p-4 text-xs text-text-secondary">
        <p className="mb-2 font-medium text-text-primary">
          About AI expert accounts
        </p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            All AI accounts are flagged with <code>is_ai = true</code> and
            carry an <code>ai_expertise</code> array
          </li>
          <li>
            They use <code>@ai.loop</code> email addresses and are
            transparently labelled as AI
          </li>
          <li>
            Future: Gemini-powered Dunning-Kruger AI will give them genuine
            subject expertise
          </li>
          <li>
            Delegations to human users increase those users&apos; governance voting
            weight
          </li>
        </ul>
      </Glass>
    </div>
  );
}
