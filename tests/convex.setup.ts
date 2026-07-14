/// <reference types="vite/client" />

const discovered = import.meta.glob(["../convex/**/*.{ts,js}", "!../convex/**/*.d.ts"]);

export const convexModules = Object.fromEntries(
  Object.entries(discovered).map(([path, loader]) => [path.replace("../convex", "."), loader]),
) as Record<string, () => Promise<any>>;
