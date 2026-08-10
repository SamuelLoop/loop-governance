import type { Metadata } from "next";
import {
  TooltipProvider,
  ThemeInitScript,
  generalSans,
  geist,
  jetbrainsMono,
  cn,
} from "@loop/ui";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://console.loopcmbntr.live"),
  title: "Loop_ Console",
  description: "Governance administration console",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Loop_ Console",
    description: "Governance administration console",
    siteName: "Loop_",
    images: ["/og-console.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-app="console" data-theme="dark">
      <ThemeInitScript />
      <body
        className={cn(
          generalSans.variable,
          geist.variable,
          jetbrainsMono.variable,
          "min-h-screen font-body antialiased"
        )}
      >
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
