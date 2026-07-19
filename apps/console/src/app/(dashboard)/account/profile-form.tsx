"use client";

import { useActionState } from "react";
import { updateProfile } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ProfileForm({
  profile,
}: {
  profile: {
    display_name: string;
    avatar_url: string | null;
    location_name: string | null;
    bio: string | null;
    email: string;
  };
}) {
  const [state, action, pending] = useActionState(updateProfile, {
    error: "",
    success: false,
  });

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="rounded border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-500">
          Profile updated
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-xl font-bold text-primary">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            profile.display_name[0]?.toUpperCase()
          )}
        </div>
        <div className="flex-1">
          <Label htmlFor="avatar_url" className="mb-1 text-xs">
            Avatar URL
          </Label>
          <Input
            id="avatar_url"
            name="avatar_url"
            defaultValue={profile.avatar_url ?? ""}
            placeholder="https://example.com/avatar.jpg"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="display_name" className="mb-1 text-xs">
          Display name
        </Label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={profile.display_name}
          required
        />
      </div>

      <div>
        <Label htmlFor="email" className="mb-1 text-xs">
          Email
        </Label>
        <Input id="email" value={profile.email} disabled />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Email cannot be changed here
        </p>
      </div>

      <div>
        <Label htmlFor="location_name" className="mb-1 text-xs">
          Location
        </Label>
        <Input
          id="location_name"
          name="location_name"
          defaultValue={profile.location_name ?? ""}
          placeholder="London, UK"
        />
      </div>

      <div>
        <Label htmlFor="bio" className="mb-1 text-xs">
          Bio
        </Label>
        <Textarea
          id="bio"
          name="bio"
          defaultValue={profile.bio ?? ""}
          placeholder="Tell people about yourself and your governance interests..."
          rows={3}
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save profile"}
      </Button>
    </form>
  );
}
