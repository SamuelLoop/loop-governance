"use client";

import { useRef } from "react";
import { useActionState } from "react";
import { changePassword } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(
    async (prev: { error: string; success: boolean }, formData: FormData) => {
      const result = await changePassword(prev, formData);
      if (result.success) formRef.current?.reset();
      return result;
    },
    { error: "", success: false }
  );

  return (
    <form ref={formRef} action={action} className="space-y-4">
      {state.error && (
        <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="rounded border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-500">
          Password updated
        </div>
      )}

      <div>
        <Label htmlFor="password" className="mb-1 text-xs">
          New password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          placeholder="At least 8 characters"
        />
      </div>

      <div>
        <Label htmlFor="confirm" className="mb-1 text-xs">
          Confirm new password
        </Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          placeholder="Repeat the new password"
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Change password"}
      </Button>
    </form>
  );
}
