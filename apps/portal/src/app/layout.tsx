import type { Metadata } from "next";
import { generalSans, geist, jetbrainsMono, cn } from "@loop/ui";
import "./globals.css";
import { PortalNav } from "./portal-nav";

export const metadata: Metadata = {
  title: "Loop_cmbntr Governance",
  description: "Rule the world. And get paid for it.",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Loop_cmbntr Governance",
    description: "Rule the world. And get paid for it.",
    siteName: "Loop_cmbntr",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-app="portal">
      <body
        className={cn(
          generalSans.variable,
          geist.variable,
          jetbrainsMono.variable,
          "min-h-screen font-body antialiased"
        )}
      >
        <PortalNav />
        {children}
      </body>
    </html>
  );
}
