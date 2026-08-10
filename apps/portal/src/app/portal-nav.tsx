import { createServiceClient } from "@/lib/supabase-server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import Link from "next/link";
import { NavLinks } from "./nav-links";

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
    <nav className="sticky top-0 z-50 border-b border-border bg-surface px-6 py-3 backdrop-blur-[var(--blur-glass)]">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/wordmark-portal.svg" alt="Loop_ Governance" className="h-7 w-auto" />
        </Link>
        <NavLinks profile={profile} />
      </div>
    </nav>
  );
}
