"use client";

import { useState, useActionState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { devLogin } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type Mode = "signin" | "signup" | "magic" | "reset";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("error") ?? "";
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

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
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
      return;
    }

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

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  async function handleSocialLogin(provider: "google" | "linkedin_oidc" | "x" | "apple") {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
    }
  }

  if (sent) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <img
              src="/logo.png"
              alt="Loop_cmbntr"
              className="mx-auto mb-2 h-12 w-12 rounded-lg"
            />
            <CardTitle className="text-xl">Check your email</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
              {mode === "signup"
                ? "We've sent a confirmation link to your email. Click it to activate your account."
                : mode === "reset"
                  ? "We've sent a password reset link to your email."
                  : "We've sent a magic link to your email. Click it to sign in."}
            </div>
            <Button
              variant="ghost"
              className="mt-4 w-full"
              onClick={() => {
                setSent(false);
                setMode("signin");
              }}
            >
              Back to sign in
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <img
            src="/logo.png"
            alt="Loop_cmbntr"
            className="mx-auto mb-2 h-12 w-12 rounded-lg"
          />
          <CardTitle className="text-xl">
            Loop<span className="text-muted-foreground">_</span>
            <span className="text-red-500">cmbntr</span>{" "}
            <span className="font-normal text-muted-foreground">Console</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {mode === "signup"
              ? "Create your account"
              : mode === "magic"
                ? "Sign in with a magic link"
                : mode === "reset"
                  ? "Reset your password"
                  : "Sign in to continue"}
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Social login buttons */}
          {(mode === "signin" || mode === "signup") && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleSocialLogin("google")}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Google
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleSocialLogin("x")}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  X
                </Button>
              </div>

              <div className="relative my-6">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                  or continue with email
                </span>
              </div>
            </>
          )}

          {/* Email + Password form */}
          {(mode === "signin" || mode === "signup") && (
            <form onSubmit={handleEmailPassword} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? "Please wait..."
                  : mode === "signup"
                    ? "Create account"
                    : "Sign in"}
              </Button>
            </form>
          )}

          {/* Magic link form */}
          {mode === "magic" && (
            <form onSubmit={handleMagicLink} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send magic link"}
              </Button>
            </form>
          )}

          {/* Reset password form */}
          {mode === "reset" && (
            <form onSubmit={handleResetPassword} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send reset link"}
              </Button>
            </form>
          )}

          {/* Mode switchers */}
          <div className="mt-4 space-y-2 text-center text-xs text-muted-foreground">
            {mode === "signin" && (
              <>
                <p>
                  <button
                    type="button"
                    onClick={() => { setError(""); setMode("reset"); }}
                    className="text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                  {" / "}
                  <button
                    type="button"
                    onClick={() => { setError(""); setMode("magic"); }}
                    className="text-primary hover:underline"
                  >
                    Use magic link
                  </button>
                </p>
                <p>
                  No account?{" "}
                  <button
                    type="button"
                    onClick={() => { setError(""); setMode("signup"); }}
                    className="text-primary hover:underline"
                  >
                    Create one
                  </button>
                </p>
              </>
            )}
            {mode === "signup" && (
              <p>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setError(""); setMode("signin"); }}
                  className="text-primary hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
            {(mode === "magic" || mode === "reset") && (
              <p>
                <button
                  type="button"
                  onClick={() => { setError(""); setMode("signin"); }}
                  className="text-primary hover:underline"
                >
                  Back to sign in
                </button>
              </p>
            )}
          </div>

          {/* Dev login (hidden in production) */}
          {process.env.NODE_ENV === "development" && (
            <>
              <div className="relative my-6">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                  dev only
                </span>
              </div>
              {devState.error && (
                <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                  {devState.error}
                </div>
              )}
              <form action={devAction}>
                <input type="hidden" name="email" value={email} />
                <Button type="submit" variant="outline" className="w-full">
                  Instant sign in (dev)
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
