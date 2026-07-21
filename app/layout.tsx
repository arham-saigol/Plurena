import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import Providers from "@/components/providers";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });

export const metadata: Metadata = {
  title: {
    default: "Plurena — Test ideas with a synthetic audience",
    template: "%s · Plurena",
  },
  description:
    "Get directional feedback on marketing ideas from audience-specific synthetic respondents.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={dmSans.variable}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
