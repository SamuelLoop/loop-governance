import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

// Bridges a mobile session into a console web session: given the mobile
// app's Supabase access token, mints a one-time magic link the mobile app
// can load in an in-app WebView so /auth/callback signs the user in there
// too, instead of dropping them at the web login screen.
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.replace(/^Bearer\s+/i, "");
  if (!accessToken) {
    return NextResponse.json({ error: "Missing access token" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const path = typeof body.path === "string" ? body.path : "/";
  const safePath = path.startsWith("/") && !path.startsWith("//") ? path : "/";

  const admin = createServiceClient();

  const { data: userData, error: userErr } = await admin.auth.getUser(accessToken);
  if (userErr || !userData?.user?.email) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const origin = new URL(request.url).origin;

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: userData.user.email,
    options: { redirectTo: `${origin}/auth/mobile-bridge?next=${encodeURIComponent(safePath)}` },
  });

  if (linkErr || !linkData?.properties?.action_link) {
    return NextResponse.json(
      { error: linkErr?.message ?? "Could not generate link" },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: linkData.properties.action_link });
}
