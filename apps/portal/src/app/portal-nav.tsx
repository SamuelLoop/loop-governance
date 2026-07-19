import { createServiceClient } from "@/lib/supabase-server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

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
    <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-neutral-800/50 bg-neutral-950/80 px-6 py-3 backdrop-blur-md">
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
      <div className="flex items-center gap-2">
        <a
          href="/#subjects"
          className="rounded-md bg-purple-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-purple-500"
        >
          Subjects
        </a>
        <a
          href="/buy"
          className="rounded-md bg-emerald-500 px-4 py-1.5 text-xs font-medium text-neutral-950 transition hover:bg-emerald-400"
        >
          Buy LOOP
        </a>
        <a
          href="/create"
          className="rounded-md bg-amber-500 px-4 py-1.5 text-xs font-medium text-neutral-950 transition hover:bg-amber-400"
        >
          Create
        </a>
        <a
          href="https://console.loopcmbntr.live"
          className="rounded-md bg-sky-400 px-4 py-1.5 text-xs font-medium text-neutral-950 transition hover:bg-sky-300"
        >
          Console
        </a>
        {profile ? (
          <a
            href="https://console.loopcmbntr.live/account"
            className="ml-1 flex items-center gap-2 rounded-full border border-neutral-700 px-2 py-1 transition hover:border-neutral-500"
          >
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-medium text-amber-400">
                {profile.display_name?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <span className="hidden text-xs text-neutral-300 sm:inline">
              {profile.display_name}
            </span>
          </a>
        ) : (
          <a
            href="https://console.loopcmbntr.live/login"
            className="ml-1 rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-300 transition hover:border-neutral-500"
          >
            Sign in
          </a>
        )}
      </div>
    </nav>
  );
}
