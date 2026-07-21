/**
 * Maps Clerk's theme variables onto the app's design tokens so Clerk UI
 * follows the active light/dark theme automatically.
 */
export const clerkAppearance = {
  variables: {
    colorBackground: "var(--card)",
    colorText: "var(--foreground)",
    colorTextSecondary: "var(--muted-foreground)",
    colorPrimary: "var(--cta)",
    colorNeutral: "var(--foreground)",
    colorInputBackground: "var(--background)",
    colorInputText: "var(--foreground)",
    // Keep in sync with --radius in app/globals.css; Clerk needs a literal here.
    borderRadius: "0.625rem",
  },
};
