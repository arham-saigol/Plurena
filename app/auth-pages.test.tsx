// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import SignInPage from "./sign-in/[[...sign-in]]/page";
import SignUpPage from "./sign-up/[[...sign-up]]/page";
import SsoCallbackPage from "./sso-callback/page";
import { AuthShell } from "@/components/auth-shell";
import { ConfigurationRequired } from "@/components/configuration-required";
import { GoogleAuthCard } from "@/components/google-auth-card";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ isLoaded: false, isSignedIn: false }),
  useSignIn: () => ({ fetchStatus: "idle", signIn: {} }),
}));

afterEach(() => vi.unstubAllEnvs());

describe.each([
  ["sign-in", SignInPage],
  ["sign-up", SignUpPage],
  ["SSO callback", SsoCallbackPage],
])("%s page", (_, Page) => {
  it("shows setup guidance when Convex is not configured", () => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test");
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "");

    expect(Page().type).toBe(ConfigurationRequired);
  });
});

it("includes the Convex client URL in the setup guidance", () => {
  expect(renderToStaticMarkup(<ConfigurationRequired />)).toContain(
    "NEXT_PUBLIC_CONVEX_URL",
  );
});

it("centers auth content without navigation or promotional content", () => {
  const markup = renderToStaticMarkup(
    <AuthShell>
      <p>Auth content</p>
    </AuthShell>,
  );

  expect(markup).toContain("place-items-center");
  expect(markup).toContain("Auth content");
  expect(markup).not.toContain("Back to the site");
  expect(markup).not.toContain("Bring the audience into the decision");
});

it("uses direct sign-up and sign-in copy", () => {
  const signUp = renderToStaticMarkup(<GoogleAuthCard mode="sign-up" />);
  const signIn = renderToStaticMarkup(<GoogleAuthCard mode="sign-in" />);

  expect(signUp).toContain(
    "Build and run your first panel with 25 free credits. No card or subscription required.",
  );
  expect(signUp).toContain('href="/terms"');
  expect(signUp).toContain('href="/privacy"');
  expect(signIn).toContain(
    "Return to your drafts, active panels, and reports.",
  );
  expect(signIn).toContain("Create a workspace");
  expect(signIn).toContain('href="/terms"');
  expect(signIn).toContain('href="/privacy"');
});
