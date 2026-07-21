import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import Providers from "@/components/providers";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });

export const metadata: Metadata = {
  title: {
    default: "Plurena · Know which message wins before you ship",
    template: "%s · Plurena",
  },
  description:
    "Plurena builds a panel of synthetic respondents from your audience description, runs your options past them, and reports the winner with the reasoning behind it.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBFAF9" },
    { media: "(prefers-color-scheme: dark)", color: "#1F1F1F" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={dmSans.variable} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
