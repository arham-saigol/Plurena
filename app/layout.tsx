import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/components/providers";
import "./globals.css";
import "./premium.css";
import { DM_Mono, DM_Sans, Space_Grotesk } from "next/font/google";
import { cn } from "@/lib/utils";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: { default: "Plurena", template: "%s · Plurena" },
  description: "Test creative, concepts, and questions with balanced AI respondent panels.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
};

const themeScript = `try{const t=localStorage.getItem('plurena-theme');const d=t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light'}catch{}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-in"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth" className={cn("font-sans", dmSans.variable, spaceGrotesk.variable, dmMono.variable)}>
        <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
        <body><ConvexClientProvider>{children}</ConvexClientProvider></body>
      </html>
    </ClerkProvider>
  );
}
