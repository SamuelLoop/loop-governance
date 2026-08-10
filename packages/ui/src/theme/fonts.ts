import localFont from "next/font/local";

/**
 * Self-hosted font loaders — single source of truth for all 3 apps.
 * Produces the exact CSS variable names theme.css's font stack expects
 * (see theme.css §1). Import once per app in RootLayout and spread each
 * font's `.variable` onto <body> (or <html>) — see any app's layout.tsx
 * for the working example.
 *
 * Files: packages/ui/fonts/{general-sans,geist,jetbrains-mono}/*.woff2 —
 * sourced + license-verified session web-06-brand (see fonts/README.md).
 */

export const generalSans = localFont({
  src: "../../fonts/general-sans/GeneralSans-Bold.woff2",
  weight: "700",
  variable: "--font-general-sans",
  display: "swap",
});

export const geist = localFont({
  src: "../../fonts/geist/Geist-Regular.woff2",
  weight: "400",
  variable: "--font-geist",
  display: "swap",
});

export const jetbrainsMono = localFont({
  src: [
    {
      path: "../../fonts/jetbrains-mono/JetBrainsMono-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../fonts/jetbrains-mono/JetBrainsMono-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-jetbrains-mono",
  display: "swap",
});
