"use client";

import { useActionState } from "react";
import { createCampaign } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CampaignForm({
  userId,
  communities,
}: {
  userId: string;
  communities: { id: string; name: string; level: string; subject: string }[];
}) {
  const [state, action] = useActionState(createCampaign, { error: "" });

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="user_id" value={userId} />

      {state.error && (
        <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div>
        <Label htmlFor="community_id" className="text-xs">
          Community
        </Label>
        <Select name="community_id">
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Choose a community" />
          </SelectTrigger>
          <SelectContent>
            {communities.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} ({c.subject} / {c.level})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="pitch" className="text-xs">
          Your pitch
        </Label>
        <Textarea
          name="pitch"
          placeholder="Why should people delegate their vote to you? What is your vision for this community?"
          rows={4}
          className="mt-1"
          required
        />
      </div>

      <div>
        <Label htmlFor="experience" className="text-xs">
          Relevant experience
        </Label>
        <Textarea
          name="experience"
          placeholder="What experience qualifies you for leadership?"
          rows={2}
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="goals" className="text-xs">
          Goals if elected
        </Label>
        <Textarea
          name="goals"
          placeholder="What will you achieve for the community?"
          rows={2}
          className="mt-1"
        />
      </div>

      <Button type="submit">Publish campaign</Button>
    </form>
  );
}
