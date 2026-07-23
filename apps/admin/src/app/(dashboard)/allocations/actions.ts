"use server";

import { requireAdminSession } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function upsertAllocation(
  _prev: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const session = await requireAdminSession();

  if (session.platformRole === "org_manager") {
    return { error: "Org managers cannot modify allocations" };
  }

  const whLabelId = formData.get("white_label_id") as string;
  const subject = formData.get("subject") as string;
  const allocationPct = parseFloat(formData.get("allocation_pct") as string);
  const proposalCapCents = formData.get("proposal_cap_cents")
    ? parseInt(formData.get("proposal_cap_cents") as string)
    : null;

  if (!whLabelId || !subject) return { error: "Missing fields" };
  if (isNaN(allocationPct) || allocationPct < 0 || allocationPct > 100) {
    return { error: "Allocation must be 0-100" };
  }

  if (session.platformRole !== "platform_admin" && session.whiteLabel?.id !== whLabelId) {
    return { error: "Cannot modify allocations for other organizations" };
  }

  const admin = createServiceClient();

  const { error } = await admin.from("subject_allocations").upsert(
    {
      white_label_id: whLabelId,
      subject,
      allocation_pct: allocationPct,
      proposal_cap_cents: proposalCapCents,
      updated_by: session.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "white_label_id,subject" }
  );

  if (error) return { error: error.message };

  await admin.from("admin_audit_log").insert({
    white_label_id: whLabelId,
    actor_id: session.userId,
    event_type: "treasury.allocation_changed",
    target_type: "subject_allocations",
    target_id: whLabelId,
    detail: { subject, allocation_pct: allocationPct, proposal_cap_cents: proposalCapCents },
  });

  revalidatePath("/allocations");
  return { error: "" };
}

export async function deleteAllocation(
  _prev: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const session = await requireAdminSession();

  if (session.platformRole === "org_manager") {
    return { error: "Org managers cannot delete allocations" };
  }

  const id = formData.get("id") as string;
  if (!id) return { error: "Missing allocation ID" };

  const admin = createServiceClient();

  const { data: allocation } = await admin
    .from("subject_allocations")
    .select("white_label_id, subject")
    .eq("id", id)
    .single();

  if (!allocation) return { error: "Allocation not found" };

  if (session.platformRole !== "platform_admin" && session.whiteLabel?.id !== allocation.white_label_id) {
    return { error: "Cannot delete allocations for other organizations" };
  }

  const { error } = await admin.from("subject_allocations").delete().eq("id", id);
  if (error) return { error: error.message };

  await admin.from("admin_audit_log").insert({
    white_label_id: allocation.white_label_id,
    actor_id: session.userId,
    event_type: "treasury.allocation_deleted",
    target_type: "subject_allocations",
    target_id: id,
    detail: { subject: allocation.subject },
  });

  revalidatePath("/allocations");
  return { error: "" };
}
