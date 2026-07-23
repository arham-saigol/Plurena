/**
 * Maps Clerk's theme variables onto the app's design tokens so Clerk UI
 * follows the active light/dark theme automatically.
 */
export const clerkAppearance = {
  variables: {
    colorPrimary: "var(--cta)",
    colorPrimaryForeground: "var(--cta-foreground)",
    colorDanger: "var(--destructive)",
    colorNeutral: "var(--foreground)",
    colorForeground: "var(--foreground)",
    colorMuted: "var(--muted)",
    colorMutedForeground: "var(--muted-foreground)",
    colorBackground: "var(--card)",
    colorInput: "var(--background)",
    colorInputForeground: "var(--foreground)",
    colorRing: "var(--ring)",
    colorBorder: "var(--border)",
    colorModalBackdrop: "rgba(0, 0, 0, 0.72)",
    // Keep in sync with --radius in app/globals.css; Clerk needs a literal here.
    borderRadius: "0.625rem",
  },
  elements: {
    cardBox: {
      backgroundColor: "var(--card)",
      border: "1px solid var(--border)",
      boxShadow: "var(--shadow-lift)",
      overflow: "hidden",
    },
    card: {
      backgroundColor: "var(--card)",
    },
    navbar: {
      backgroundColor: "var(--background)",
      borderColor: "var(--border)",
    },
    navbarButton: {
      color: "var(--muted-foreground)",
    },
    navbarButton__active: {
      backgroundColor: "var(--green-soft)",
      color: "var(--green)",
    },
    pageScrollBox: {
      backgroundColor: "var(--card)",
    },
    profileSection: {
      borderColor: "var(--border)",
    },
    profileSectionPrimaryButton: {
      color: "var(--green)",
    },
  },
};
