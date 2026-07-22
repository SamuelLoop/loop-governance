import { createServiceClient } from "@/lib/supabase-server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
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
    <nav className="sticky top-0 z-50 border-b border-neutral-800/50 bg-neutral-950/80 px-6 py-3 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="Loop_cmbntr"
            className="h-8 w-8 rounded-md"
          />
          <span className="text-sm font-semibold tracking-tight text-neutral-100">
            Loop<span className="text-neutral-500">_</span>
            <span className="text-red-500">cmbntr</span>
          </span>
        </a>
        <NavLinks profile={profile} />
      </div>
    </nav>
  );
}
