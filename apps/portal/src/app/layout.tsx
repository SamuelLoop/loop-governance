import type { Metadata } from "next";
import { generalSans, geist, jetbrainsMono } from "@loop/ui";
import "./globals.css";
import { PortalNav } from "./portal-nav";

export const metadata: Metadata = {
  metadataBase: new URL("https://gov.loopcmbntr.live"),
  title: "Loop_ Governance",
  description: "Rule the world. And get paid for it.",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Loop_ Governance",
    description: "Rule the world. And get paid for it.",
    siteName: "Loop_",
    images: ["/og-portal.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-app="portal"
      className={`${generalSans.variable} ${geist.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-background text-foreground font-body antialiased">
        <PortalNav />
        {children}
      </body>
    </html>
  );
}
