"use server";

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { sendBulkLiquidityAnnouncement } from "@/lib/announcement-email";

export async function POST(req: Request) {
  const { secret } = await req.json();
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceClient();

  const { data: users } = await admin
    .from("users")
    .select("email, display_name")
    .not("email", "is", null);

  if (!users || users.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const recipients = users
    .filter((u: any) => u.email && !u.email.endsWith("@loop-ai.local"))
    .map((u: any) => ({
      email: u.email,
      displayName: u.display_name ?? "Governor",
    }));

  await sendBulkLiquidityAnnouncement(recipients);

  return NextResponse.json({ sent: recipients.length });
}
