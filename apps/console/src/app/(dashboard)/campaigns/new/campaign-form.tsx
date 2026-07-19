"use client";

import { useActionState, useState, useCallback } from "react";
import { createCampaign } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TiptapEditor } from "./tiptap-editor";
import { getCampaignTemplate, getFlyerTemplate } from "./templates";

type Community = {
  id: string;
  name: string;
  level: string;
  subject: string;
  slug: string;
};

export function CampaignForm({
  userId,
  userName,
  communities,
}: {
  userId: string;
  userName: string;
  communities: Community[];
}) {
  const [state, action, pending] = useActionState(createCampaign, {
    error: "",
  });
  const [campaignType, setCampaignType] = useState<"campaign" | "flyer">(
    "campaign"
  );
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(
    null
  );
  const [content, setContent] = useState<any>(null);
  const [headline, setHeadline] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [templateLoaded, setTemplateLoaded] = useState(false);

  const loadTemplate = useCallback(
    (community: Community, type: "campaign" | "flyer") => {
      const template =
        type === "campaign"
          ? getCampaignTemplate(
              userName,
              community.name,
              community.subject,
              community.level
            )
          : getFlyerTemplate(community.name, community.subject, community.level);

      setContent(template);
      setHeadline(
        type === "campaign"
          ? `Vote for ${userName}`
          : community.name
      );
      setTemplateLoaded(true);
    },
    [userName]
  );

  const handleCommunityChange = useCallback(
    (communityId: string | null) => {
      if (!communityId) return;
      const community = communities.find((c) => c.id === communityId);
      if (community) {
        setSelectedCommunity(community);
        loadTemplate(community, campaignType);
      }
    },
    [communities, campaignType, loadTemplate]
  );

  const handleTypeChange = useCallback(
    (type: "campaign" | "flyer") => {
      setCampaignType(type);
      if (selectedCommunity) {
        loadTemplate(selectedCommunity, type);
      }
    },
    [selectedCommunity, loadTemplate]
  );

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="content" value={JSON.stringify(content)} />
      <input type="hidden" name="headline" value={headline} />
      <input type="hidden" name="youtube_url" value={youtubeUrl} />
      <input type="hidden" name="banner_url" value={bannerUrl} />

      {state.error && (
        <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}

      {/* Step 1: Type and community selection */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="mb-1.5 text-xs">What are you creating?</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleTypeChange("campaign")}
              className={`rounded-lg border p-3 text-left transition-colors ${
                campaignType === "campaign"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <p className="text-sm font-medium">Campaign poster</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                "Vote for me" page
              </p>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange("flyer")}
              className={`rounded-lg border p-3 text-left transition-colors ${
                campaignType === "flyer"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <p className="text-sm font-medium">Community flyer</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Recruit new members
              </p>
            </button>
          </div>
          <input type="hidden" name="type" value={campaignType} />
        </div>

        <div>
          <Label className="mb-1.5 text-xs">Community</Label>
          <Select
            name="community_id"
            onValueChange={handleCommunityChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a community" />
            </SelectTrigger>
            <SelectContent>
              {communities.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} ({c.level})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Step 2: Only show after community is selected */}
      {templateLoaded && selectedCommunity && (
        <>
          <div>
            <Label htmlFor="headline" className="mb-1.5 text-xs">
              Headline
            </Label>
            <Input
              id="headline"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder={
                campaignType === "campaign"
                  ? "Vote for [your name]"
                  : "Join [community name]"
              }
            />
          </div>

          <div>
            <Label htmlFor="banner_url" className="mb-1.5 text-xs">
              Banner image (optional)
            </Label>
            <Input
              id="banner_url"
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              placeholder="https://example.com/banner.jpg"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              A wide banner image displayed at the top of your page. Use a landscape image for best results (1200x400px recommended).
            </p>
          </div>

          <div>
            <Label htmlFor="youtube_url" className="mb-1.5 text-xs">
              YouTube video (optional)
            </Label>
            <Input
              id="youtube_url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Record a short video pitch and paste the link here. It will be
              embedded at the top of your{" "}
              {campaignType === "campaign" ? "poster" : "flyer"}.
            </p>
          </div>

          <div>
            <Label className="mb-1.5 text-xs">
              {campaignType === "campaign" ? "Your campaign" : "Your flyer"}
            </Label>
            <p className="mb-2 text-[11px] text-muted-foreground">
              We've pre-filled a template to get you started. Edit the text
              below, add images, embed videos, and make it yours.
            </p>
            <TiptapEditor content={content} onChange={setContent} />
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
            <div>
              <p className="text-sm font-medium">Ready to publish?</p>
              <p className="text-xs text-muted-foreground">
                {campaignType === "campaign"
                  ? "Your poster will be live and shareable. Community members can pledge their vote."
                  : "Your flyer will be live and shareable on social media. Anyone can join from it."}
              </p>
            </div>
            <Button type="submit" disabled={pending}>
              {pending
                ? "Publishing..."
                : campaignType === "campaign"
                  ? "Publish campaign"
                  : "Publish flyer"}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
