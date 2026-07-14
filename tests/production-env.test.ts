import { describe, expect, it } from "vitest";
import { validateProductionEnvironment } from "@/lib/production-env";

const validProductionEnv = {
  NODE_ENV: "production",
  NEXT_PUBLIC_APP_URL: "https://plurena.example",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_example",
  CLERK_SECRET_KEY: "sk_test_example",
  NEXT_PUBLIC_CONVEX_URL: "https://example.convex.cloud",
  CLERK_WEBHOOK_SIGNING_SECRET: "whsec_example",
  CLERK_WEBHOOK_FORWARD_SECRET: "forward-secret",
} as NodeJS.ProcessEnv;

describe("production environment validation", () => {
  it("rejects missing Clerk and canonical URL configuration", () => {
    expect(() => validateProductionEnvironment({ NODE_ENV: "production" })).toThrow(/NEXT_PUBLIC_APP_URL is required/);
    expect(() => validateProductionEnvironment({ NODE_ENV: "production" })).toThrow(/NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required/);
  });

  it("rejects localhost production origins", () => {
    expect(() => validateProductionEnvironment({ ...validProductionEnv, NEXT_PUBLIC_APP_URL: "http://localhost:3000" })).toThrow(/bare HTTPS origin/);
  });

  it("accepts complete HTTPS production configuration", () => {
    expect(() => validateProductionEnvironment(validProductionEnv)).not.toThrow();
  });
});
