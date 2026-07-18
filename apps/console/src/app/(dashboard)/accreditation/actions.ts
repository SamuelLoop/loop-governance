"use server";

import { createServiceClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

type State = { error: string; success: boolean };

export async function giveAccreditation(
  _prev: State,
  formData: FormData
): Promise<State> {
  const admin = createServiceClient();

  const giverId = formData.get("giverId") as string;
  const receiverId = formData.get("receiverId") as string;
  const communityId = formData.get("communityId") as string;
  const subjectTag = formData.get("subjectTag") as string;

  if (!receiverId || !communityId || !subjectTag) {
    return { error: "All fields are required.", success: false };
  }

  if (giverId === receiverId) {
    return { error: "You cannot accredit yourself.", success: false };
  }

  const { error } = await admin.from("accreditations").upsert(
    {
      giver_id: giverId,
      receiver_id: receiverId,
      community_id: communityId,
      subject_tag: subjectTag,
      active: true,
      weight: 1,
    },
    { onConflict: "giver_id,receiver_id,community_id,subject_tag" }
  );

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath("/accreditation");
  return { error: "", success: true };
}
