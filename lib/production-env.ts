const requiredProductionVariables = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CONVEX_URL",
  "CLERK_WEBHOOK_SIGNING_SECRET",
  "CLERK_WEBHOOK_FORWARD_SECRET",
] as const;

export function validateProductionEnvironment(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV !== "production") return;
  const errors = requiredProductionVariables
    .filter((name) => !env[name]?.trim())
    .map((name) => `${name} is required`);

  validateHttpsOrigin(env.NEXT_PUBLIC_APP_URL, "NEXT_PUBLIC_APP_URL", errors);
  validateHttpsOrigin(env.NEXT_PUBLIC_CONVEX_URL, "NEXT_PUBLIC_CONVEX_URL", errors);
  if (env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !/^pk_(test|live)_/.test(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)) {
    errors.push("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must be a Clerk publishable key");
  }
  if (env.CLERK_SECRET_KEY && !/^sk_(test|live)_/.test(env.CLERK_SECRET_KEY)) {
    errors.push("CLERK_SECRET_KEY must be a Clerk secret key");
  }
  if (errors.length) throw new Error(`Invalid production configuration:\n- ${errors.join("\n- ")}`);
}

function validateHttpsOrigin(value: string | undefined, name: string, errors: string[]) {
  if (!value) return;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
      errors.push(`${name} must be a bare HTTPS origin`);
    }
    if (["localhost", "127.0.0.1", "::1"].includes(url.hostname)) errors.push(`${name} cannot use localhost in production`);
  } catch {
    errors.push(`${name} must be a valid URL`);
  }
}
