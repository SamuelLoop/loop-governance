import Script from "next/script";

/**
 * Flash-of-wrong-theme prevention — console/admin only, per
 * DESIGN.web.md's light-mode addendum + sessions/web-eng-plan-output.md
 * decision 8. Runs before React hydrates (`next/script`'s
 * `beforeInteractive` strategy, same mechanism `next-themes` uses under
 * the hood) and sets `data-theme` on <html> from localStorage before any
 * paint, so SSR's default dark render never visibly flips to light after
 * hydration.
 *
 * Local-only for now (session 7 / scaffold scope) — DB-backed cross-app
 * sync (a member's light-mode choice on console should also apply to
 * admin, separate origins) is eng-plan task T8, not built yet. See
 * DESIGN.web.md decision log / sessions/web-eng-plan-output.md decision 8
 * for the reasoning and the follow-up plan.
 *
 * Place as the FIRST child of <html> in each app's RootLayout, ahead of
 * <body>, so it executes ahead of any themed paint.
 */

const STORAGE_KEY = "loop-theme";

const script = `
(function () {
  try {
    var stored = localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
    var theme = stored === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();
`;

export function ThemeInitScript() {
  return (
    <Script id="loop-theme-init" strategy="beforeInteractive">
      {script}
    </Script>
  );
}

export const THEME_STORAGE_KEY = STORAGE_KEY;
