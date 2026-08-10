"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "../components/ui/button";
import { THEME_STORAGE_KEY } from "./theme-init-script";

/**
 * Sun/moon control — console/admin topbar/sidebar footer only (portal is
 * fixed-light, no toggle). Default stays dark per DESIGN.web.md's
 * "Console/admin light mode" addendum: dark is still the primary
 * "command-center" identity, light is an opt-in.
 *
 * Local-only persistence (localStorage) — see theme-init-script.tsx for
 * why DB-backed cross-app sync isn't wired yet.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = React.useState<"dark" | "light" | null>(null);

  React.useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "light" ? "light" : "dark");
  }, []);

  const toggle = React.useCallback(() => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // localStorage blocked (private browsing, enterprise policy) — the
      // toggle still works for this page load, it just won't persist.
    }
  }, [theme]);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      className={className}
      aria-label={
        theme === "light" ? "Switch to dark mode" : "Switch to light mode"
      }
    >
      {theme === "light" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </Button>
  );
}
