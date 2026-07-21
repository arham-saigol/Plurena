"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, useSignIn } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const copy = {
  "sign-in": {
    eyebrow: "Welcome back",
    title: "Continue to Plurena",
    description:
      "Open your workspace to continue a draft, check a live panel, or review a decision.",
    action: "Continue with Google",
    alternate: "New to Plurena?",
    alternateAction: "Start free",
    alternateHref: "/sign-up",
  },
  "sign-up": {
    eyebrow: "Start with 25 credits",
    title: "Make the next choice clearer",
    description:
      "Create your workspace and run a useful first panel—no card or subscription required.",
    action: "Start with Google",
    alternate: "Already have a workspace?",
    alternateAction: "Log in",
    alternateHref: "/sign-in",
  },
} as const;

export function GoogleAuthCard({ mode }: { mode: keyof typeof copy }) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { signIn, fetchStatus } = useSignIn();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const content = copy[mode];

  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace("/app");
  }, [isLoaded, isSignedIn, router]);

  async function continueWithGoogle() {
    if (isSignedIn) {
      router.replace("/app");
      return;
    }

    setError(undefined);
    setSubmitting(true);
    try {
      const result = await signIn.sso({
        strategy: "oauth_google",
        redirectUrl: "/app",
        redirectCallbackUrl: "/sso-callback",
      });
      if (result.error) {
        setError("Google sign-in could not be started. Please try again.");
        setSubmitting(false);
      }
    } catch {
      setError("Google sign-in could not be started. Please try again.");
      setSubmitting(false);
    }
  }

  if (isLoaded && isSignedIn) {
    return (
      <div className="bg-card rounded-2xl border p-8 text-center shadow-[var(--shadow-md)]">
        <Loader2 className="mx-auto size-5 animate-spin text-[var(--orange)]" />
        <p className="mt-4 font-semibold">Opening your workspace</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Your session is ready.
        </p>
      </div>
    );
  }

  const busy = !isLoaded || submitting || fetchStatus === "fetching";

  return (
    <div className="bg-card rounded-2xl border p-6 shadow-[var(--shadow-md)] sm:p-8">
      <p className="eyebrow">{content.eyebrow}</p>
      <h1 className="mt-2 text-3xl font-bold tracking-[-0.045em] text-balance">
        {content.title}
      </h1>
      <p className="text-muted-foreground mt-3 text-sm leading-6">
        {content.description}
      </p>

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="mt-7 w-full"
        disabled={busy}
        onClick={continueWithGoogle}
      >
        {busy ? <Loader2 className="animate-spin" /> : <GoogleIcon />}
        {busy ? "Connecting…" : content.action}
      </Button>

      {error && (
        <p role="alert" className="text-destructive mt-3 text-sm">
          {error}
        </p>
      )}
      <div id="clerk-captcha" />

      <p className="text-muted-foreground mt-6 text-center text-sm">
        {content.alternate}{" "}
        <Link
          href={content.alternateHref}
          className="text-foreground font-semibold underline-offset-4 hover:underline"
        >
          {content.alternateAction}
        </Link>
      </p>
      <p className="text-muted-foreground mt-5 border-t pt-5 text-center text-xs leading-5">
        By continuing, you agree to use Plurena for directional research and
        validate high-stakes decisions with real customers too.
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.89h5.38a4.6 4.6 0 0 1-2 3.02v2.52h3.24c1.9-1.75 2.98-4.33 2.98-7.37Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.98-.9 6.63-2.4l-3.24-2.52c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.77-5.61-4.14H3.04v2.6A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.39 13.9A6 6 0 0 1 6.08 12c0-.66.11-1.3.31-1.9V7.5H3.04A10 10 0 0 0 2 12c0 1.62.39 3.15 1.04 4.5l3.35-2.6Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.96c1.47 0 2.79.5 3.82 1.5l2.88-2.88A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.5l3.35 2.6C7.18 7.73 9.39 5.96 12 5.96Z"
      />
    </svg>
  );
}
