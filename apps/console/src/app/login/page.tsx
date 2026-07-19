"use client";

import { useState, useActionState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { devLogin } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
          <p className="text-sm text-muted-foreground">Sign in to continue</p>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
              Check your email for a magic link to sign in.
            </div>
          ) : (
            <>
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                  />
                </div>
                <Button type="submit" className="w-full">
                  Send magic link
                </Button>
              </form>

              <div className="relative my-6">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                  or
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
