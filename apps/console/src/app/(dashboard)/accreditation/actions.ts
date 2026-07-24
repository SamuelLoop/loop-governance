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
  const subjectTag = formData.get("subjectTag") as string;

  if (!receiverId || !subjectTag) {
    return { error: "Select a peer and a subject.", success: false };
  }

  if (giverId === receiverId) {
    return { error: "You cannot accredit yourself.", success: false };
  }

  const { data: existing } = await admin
    .from("accreditations")
    .select("id")
    .eq("giver_id", giverId)
    .eq("receiver_id", receiverId)
    .eq("subject_tag", subjectTag)
    .eq("active", true)
    .maybeSingle();

  if (existing) {
    return { error: "You have already accredited this person for this subject.", success: false };
  }

  const { error } = await admin.from("accreditations").insert({
    giver_id: giverId,
    receiver_id: receiverId,
    subject_tag: subjectTag,
    active: true,
    weight: 1,
  });

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath("/give-power");
  revalidatePath("/accreditation");
  return { error: "", success: true };
}
