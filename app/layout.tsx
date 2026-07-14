import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/components/providers";
import "./globals.css";

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
      <html lang="en" suppressHydrationWarning>
        <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
        <body><ConvexClientProvider>{children}</ConvexClientProvider></body>
      </html>
    </ClerkProvider>
  );
}
