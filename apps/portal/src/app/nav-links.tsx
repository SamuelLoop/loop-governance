"use client";

import { useState } from "react";

type Profile = {
  display_name: string;
  avatar_url: string | null;
} | null;

export function NavLinks({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/#subjects", label: "Subjects" },
    { href: "/create", label: "Create" },
    { href: "https://console.loopcmbntr.live", label: "Console" },
  ];

  return (
    <>
      {/* Desktop */}
      <div className="hidden items-center gap-5 sm:flex">
        <a
          href="/buy"
          className="rounded-md bg-emerald-500 px-4 py-1.5 text-xs font-bold text-neutral-950 transition hover:bg-emerald-400"
        >
          Buy Loop
        </a>
        {links.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="text-xs font-medium text-neutral-400 transition hover:text-neutral-100"
          >
            {l.label}
          </a>
        ))}
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
            <span className="text-xs text-neutral-300">
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

      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-neutral-700 sm:hidden"
        aria-label="Toggle menu"
      >
        {open ? (
          <svg className="h-4 w-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-4 w-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Mobile menu */}
      {open && (
        <div className="absolute left-0 right-0 top-full border-b border-neutral-800/50 bg-neutral-950/95 px-6 py-4 backdrop-blur-md sm:hidden">
          <div className="flex flex-col gap-3">
            <a
              href="/buy"
              onClick={() => setOpen(false)}
              className="rounded-md bg-emerald-500 px-4 py-2.5 text-center text-sm font-bold text-neutral-950 transition hover:bg-emerald-400"
            >
              Buy Loop
            </a>
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-4 py-2.5 text-sm font-medium text-neutral-300 transition hover:bg-neutral-800/50 hover:text-neutral-100"
              >
                {l.label}
              </a>
            ))}
            {profile ? (
              <a
                href="https://console.loopcmbntr.live/account"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-md px-4 py-2.5 transition hover:bg-neutral-800/50"
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
                <span className="text-sm text-neutral-300">
                  {profile.display_name}
                </span>
              </a>
            ) : (
              <a
                href="https://console.loopcmbntr.live/login"
                onClick={() => setOpen(false)}
                className="rounded-md border border-neutral-700 px-4 py-2.5 text-center text-sm font-medium text-neutral-300 transition hover:border-neutral-500"
              >
                Sign in
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
}
