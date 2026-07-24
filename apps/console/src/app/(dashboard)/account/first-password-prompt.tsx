"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { changePassword } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FirstPasswordPrompt() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const shouldShow = searchParams.get("prompt_password") === "1";
  const [open, setOpen] = useState(shouldShow);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setSaving(true);
    const fd = new FormData();
    fd.set("password", password);
    fd.set("confirm", confirm);
    const result = await changePassword({ error: "", success: false }, fd);
    setSaving(false);
    if (!result.success) {
      setError(result.error || "Failed to set password");
      return;
    }
    // Success: close, clean the URL param so the modal doesn't reappear on refresh
    setOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("prompt_password");
    const qs = params.toString();
    router.replace(`/account${qs ? `?${qs}` : ""}`);
  }

  function dismiss() {
    setOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("prompt_password");
    const qs = params.toString();
    router.replace(`/account${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        <h2 className="mb-1 text-lg font-semibold">Welcome — set a password</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          You signed in via magic link. Set a password now so you can sign in
          directly next time without waiting on email.
        </p>

        <form onSubmit={submit} className="space-y-3">
          {error && (
            <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <div>
            <Label htmlFor="fpw" className="mb-1 text-xs">
              New password
            </Label>
            <Input
              id="fpw"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              placeholder="At least 8 characters"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="fpwc" className="mb-1 text-xs">
              Confirm password
            </Label>
            <Input
              id="fpwc"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={8}
              placeholder="Repeat the password"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={dismiss}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Skip for now
            </button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Set password"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
