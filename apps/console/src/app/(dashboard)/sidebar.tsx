"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard", icon: "&#9632;" },
  { href: "/proposals", label: "Proposals", icon: "&#9654;" },
  { href: "/members", label: "Members", icon: "&#9679;" },
  { href: "/accreditation", label: "Accreditation", icon: "&#9733;" },
];

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="flex w-56 flex-col border-r border-neutral-800 bg-neutral-950 px-4 py-6">
      <div className="mb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-amber-500">
          Loop
        </p>
        <p className="text-sm text-neutral-400">Console</p>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition ${
                active
                  ? "bg-amber-500/10 text-amber-400"
                  : "text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200"
              }`}
            >
              <span
                className="text-[10px]"
                dangerouslySetInnerHTML={{ __html: item.icon }}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-neutral-800 pt-4">
        <p className="mb-2 truncate text-xs text-neutral-500">{userEmail}</p>
        <button
          onClick={handleSignOut}
          className="text-xs text-neutral-500 transition hover:text-neutral-300"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
