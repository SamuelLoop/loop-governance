"use client";

import { useState, useActionState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { devLogin } from "./actions";

type Mode = "signin" | "magic";

export default function AdminLoginPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const err = params.get("error");
      if (err === "admin_required") return "Admin access required. Sign in with an admin account.";
      return err ?? "";
    }
    return "";
  });
  const [loading, setLoading] = useState(false);
  const [devState, devAction] = useActionState(devLogin, { error: "" });
  const supabase = createClient();

  async function handleEmailPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      window.location.href = "/";
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6">
          <div className="text-center">
            <img src="/logo.png" alt="Loop" className="mx-auto mb-3 h-12 w-12 rounded-lg" />
            <h1 className="text-xl font-semibold">Check your email</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a magic link to your email. Click it to sign in.
            </p>
            <button
              type="button"
              onClick={() => { setSent(false); setMode("signin"); }}
              className="mt-4 text-sm text-primary hover:underline"
            >
              Back to sign in
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="Loop" className="mx-auto mb-3 h-12 w-12 rounded-lg" />
          <h1 className="text-xl font-semibold">
            Loop<span className="text-muted-foreground">_</span>
            <span className="text-red-500">cmbntr</span>{" "}
            <span className="font-normal text-muted-foreground">Admin</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "magic" ? "Sign in with a magic link" : "Sign in to the admin console"}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
            {error}
          </div>
        )}

        {mode === "signin" && (
          <form onSubmit={handleEmailPassword} className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@example.com"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Your password"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Please wait..." : "Sign in"}
            </button>
          </form>
        )}

        {mode === "magic" && (
          <form onSubmit={handleMagicLink} className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@example.com"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send magic link"}
            </button>
          </form>
        )}

        <div className="mt-4 text-center text-xs text-muted-foreground">
          {mode === "signin" ? (
            <button
              type="button"
              onClick={() => { setError(""); setMode("magic"); }}
              className="text-primary hover:underline"
            >
              Use magic link instead
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setError(""); setMode("signin"); }}
              className="text-primary hover:underline"
            >
              Back to password sign in
            </button>
          )}
        </div>

        {process.env.NODE_ENV === "development" && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <span className="relative flex justify-center text-xs text-muted-foreground">
                <span className="bg-card px-2">dev only</span>
              </span>
            </div>
            {devState.error && (
              <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                {devState.error}
              </div>
            )}
            <form action={devAction}>
              <input type="hidden" name="email" value={email} />
              <button
                type="submit"
                className="inline-flex h-9 w-full items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium shadow-sm transition-colors hover:bg-secondary"
              >
                Instant sign in (dev)
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
