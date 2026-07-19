import { createClient } from "@supabase/supabase-js";

export type WhiteLabelConfig = {
  id: string;
  name: string;
  slug: string;
  domain: string;
  brand_name: string;
  brand_logo_url: string | null;
  brand_color: string;
  governance_community_id: string | null;
  auto_enrol_community_ids: string[];
  shared_auth: boolean;
};

export async function getWhiteLabelByDomain(
  supabaseUrl: string,
  serviceRoleKey: string,
  domain: string
): Promise<WhiteLabelConfig | null> {
  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data } = await admin
    .from("white_label_configs")
    .select("*")
    .eq("domain", domain)
    .single();
  return data;
}

export async function autoEnrolWhiteLabelUser(
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string,
  whiteLabelId: string
): Promise<void> {
  const admin = createClient(supabaseUrl, serviceRoleKey);

  // Mark user's source
  await admin
    .from("users")
    .update({ source_white_label_id: whiteLabelId })
    .eq("id", userId);

  // Get white label config
  const { data: config } = await admin
    .from("white_label_configs")
    .select("auto_enrol_community_ids, governance_community_id")
    .eq("id", whiteLabelId)
    .single();

  if (!config) return;

  const communityIds = [
    ...(config.auto_enrol_community_ids ?? []),
    config.governance_community_id,
  ].filter(Boolean) as string[];

  // Auto-enrol into each community
  for (const communityId of communityIds) {
    const { data: existing } = await admin
      .from("community_memberships")
      .select("id")
      .eq("user_id", userId)
      .eq("community_id", communityId)
      .single();

    if (!existing) {
      await admin.from("community_memberships").insert({
        user_id: userId,
        community_id: communityId,
        role: "member",
      });
    }
  }
}
