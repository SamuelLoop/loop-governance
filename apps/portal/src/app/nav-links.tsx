"use client";

import { useState } from "react";
import Link from "next/link";

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
        <Link
          href="/buy"
          className="rounded-md px-4 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--accent-gradient)" }}
        >
          Buy Loop
        </Link>
        {links.map((l) =>
          l.href.startsWith("http") ? (
            <a
              key={l.href}
              href={l.href}
              className="text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              {l.label}
            </a>
          ) : (
            <Link
              key={l.href}
              href={l.href}
              className="text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              {l.label}
            </Link>
          )
        )}
        {profile ? (
          <a
            href="https://console.loopcmbntr.live/account"
            className="ml-1 flex items-center gap-2 rounded-full border border-surface-border px-2 py-1 transition-colors hover:border-text-secondary/50"
          >
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[10px] font-medium text-primary">
                {profile.display_name?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <span className="text-xs text-text-secondary">
              {profile.display_name}
            </span>
          </a>
        ) : (
          <a
            href="https://console.loopcmbntr.live/login"
            className="ml-1 rounded-md border border-surface-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-text-secondary/50"
          >
            Sign in
          </a>
        )}
      </div>

      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-surface-border sm:hidden"
        aria-label="Toggle menu"
      >
        {open ? (
          <svg className="h-4 w-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-4 w-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Mobile menu */}
      {open && (
        <div className="absolute left-0 right-0 top-full border-b border-surface-border bg-background/95 px-6 py-4 backdrop-blur-md sm:hidden">
          <div className="flex flex-col gap-3">
            <Link
              href="/buy"
              onClick={() => setOpen(false)}
              className="rounded-md px-4 py-2.5 text-center text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: "var(--accent-gradient)" }}
            >
              Buy Loop
            </Link>
            {links.map((l) =>
              l.href.startsWith("http") ? (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-secondary hover:text-text-primary"
                >
                  {l.label}
                </a>
              ) : (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-secondary hover:text-text-primary"
                >
                  {l.label}
                </Link>
              )
            )}
            {profile ? (
              <a
                href="https://console.loopcmbntr.live/account"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-md px-4 py-2.5 transition-colors hover:bg-secondary"
              >
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name}
                    className="h-6 w-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[10px] font-medium text-primary">
                    {profile.display_name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <span className="text-sm text-text-secondary">
                  {profile.display_name}
                </span>
              </a>
            ) : (
              <a
                href="https://console.loopcmbntr.live/login"
                onClick={() => setOpen(false)}
                className="rounded-md border border-surface-border px-4 py-2.5 text-center text-sm font-medium text-text-secondary transition-colors hover:border-text-secondary/50"
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
