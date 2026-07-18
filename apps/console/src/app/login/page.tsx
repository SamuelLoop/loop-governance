"use client";

import { useState, useActionState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { devLogin } from "./actions";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [devState, devAction] = useActionState(devLogin, { error: "" });
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <p className="mb-1 font-mono text-xs uppercase tracking-widest text-amber-500">
          Loop Console
        </p>
        <h1 className="mb-8 text-2xl font-light tracking-tight">Sign in</h1>

        {sent ? (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
            Check your email for a magic link to sign in.
          </div>
        ) : (
          <>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
                  {error}
                </div>
              )}
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-400"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-md border border-neutral-700 bg-neutral-800/50 px-4 py-2.5 text-neutral-100 placeholder-neutral-500 outline-none transition focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
                  placeholder="you@example.com"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-md bg-amber-600 px-4 py-2.5 font-medium text-white transition hover:bg-amber-500"
              >
                Send magic link
              </button>
            </form>

            <div className="mt-6 border-t border-neutral-800 pt-4">
              {devState.error && (
                <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
                  {devState.error}
                </div>
              )}
              <form action={devAction}>
                <input type="hidden" name="email" value={email} />
                <button
                  type="submit"
                  className="w-full rounded-md border border-neutral-700 bg-neutral-800/50 px-4 py-2.5 text-sm text-neutral-400 transition hover:border-neutral-600 hover:text-neutral-300"
                >
                  Instant sign in (dev)
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
