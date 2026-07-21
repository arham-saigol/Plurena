import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { Brand } from "@/components/brand";
import { ConfigurationRequired } from "@/components/configuration-required";

export default function SsoCallbackPage() {
  if (
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    !process.env.NEXT_PUBLIC_CONVEX_URL
  )
    return <ConfigurationRequired />;

  return (
    <main className="marketing bg-background grid min-h-screen place-items-center p-6">
      <div className="text-center">
        <Brand className="justify-center" />
        <Loader2 className="mx-auto mt-8 size-5 animate-spin text-[var(--orange)]" />
        <h1 className="mt-4 font-semibold">Finishing Google sign-in</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Your workspace will open automatically.
        </p>
      </div>
      <AuthenticateWithRedirectCallback
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
        signInForceRedirectUrl="/app"
        signUpForceRedirectUrl="/app"
        signInFallbackRedirectUrl="/app"
        signUpFallbackRedirectUrl="/app"
      />
    </main>
  );
}
