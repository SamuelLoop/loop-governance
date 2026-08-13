import { createServiceClient } from "@/lib/supabase-server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import Link from "next/link";
import { NavLinks } from "./nav-links";
import { PortalNavShell } from "@loop/ui";

async function getUser() {
  const cookieStore = await cookies();
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const admin = createServiceClient();
    const { data: profile } = await admin
      .from("users")
      .select("display_name, avatar_url")
      .eq("auth_id", user.id)
      .single();

    return profile;
  } catch {
    return null;
  }
}

export async function PortalNav() {
  const profile = await getUser();

  return (
    <PortalNavShell
      logo={
        <Link href="/" className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="Loop_cmbntr"
            className="h-8 w-8 rounded-md"
          />
          <span className="text-sm font-semibold tracking-tight text-text-primary">
            Loop<span className="text-text-muted">_</span>
            <span className="text-red-500">cmbntr</span>
          </span>
        </Link>
      }
    >
      <NavLinks profile={profile} />
    </PortalNavShell>
  );
}
