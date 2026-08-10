import type { Metadata } from "next";
import {
  ThemeInitScript,
  generalSans,
  geist,
  jetbrainsMono,
  cn,
} from "@loop/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "Loop_ Admin",
  description: "Platform administration console",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Loop_ Admin",
    description: "Platform administration console",
    siteName: "Loop_",
    images: ["/og-admin.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-app="admin" data-theme="dark">
      <ThemeInitScript />
      <body
        className={cn(
          generalSans.variable,
          geist.variable,
          jetbrainsMono.variable,
          "min-h-screen font-body antialiased"
        )}
      >
        {children}
      </body>
    </html>
  );
}
