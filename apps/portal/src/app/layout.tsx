import type { Metadata } from "next";
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
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        <PortalNav />
        {children}
      </body>
    </html>
  );
}
