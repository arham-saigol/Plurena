// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import SignInPage from "./sign-in/[[...sign-in]]/page";
import SignUpPage from "./sign-up/[[...sign-up]]/page";
import SsoCallbackPage from "./sso-callback/page";
import { ConfigurationRequired } from "@/components/configuration-required";

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
