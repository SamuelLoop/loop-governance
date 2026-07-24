import { cookies } from "next/headers";
import { createClient, createServiceClient } from "./supabase-server";

const COOKIE_NAME = "loop-subject";
const DEFAULT_SUBJECT = "governance";

export async function getActiveSubject(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? DEFAULT_SUBJECT;
}

export async function getAdminContext(): Promise<{
  isPlatformAdmin: boolean;
  profileId: string | null;
}> {
  const supabase = await createClient();
  const admin = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { isPlatformAdmin: false, profileId: null };

  const { data: profile } = await admin
    .from("users")
    .select("id, platform_role")
    .eq("auth_id", user.id)
    .single();

  return {
    isPlatformAdmin: profile?.platform_role === "platform_admin",
    profileId: profile?.id ?? null,
  };
}

export async function getSubjectCommunityIds(): Promise<{
  communityIds: string[];
  isPlatformAdmin: boolean;
  activeSubject: string;
}> {
  const admin = createServiceClient();
  const activeSubject = await getActiveSubject();
  const { isPlatformAdmin } = await getAdminContext();

  if (isPlatformAdmin) {
    const { data: allCommunities } = await admin
      .from("communities")
      .select("id");
    return {
      communityIds: (allCommunities ?? []).map((c: any) => c.id),
      isPlatformAdmin: true,
      activeSubject,
    };
  }

  const { data: subjectCommunities } = await admin
    .from("communities")
    .select("id")
    .eq("subject", activeSubject);

  return {
    communityIds: (subjectCommunities ?? []).map((c: any) => c.id),
    isPlatformAdmin: false,
    activeSubject,
  };
}
