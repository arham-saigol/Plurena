// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { AppHeader } from "@/components/app-header";

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: { fullName: "Test User", imageUrl: "https://example.com/avatar.png", primaryEmailAddress: { emailAddress: "test@example.com" } } }),
  useClerk: () => ({ openUserProfile: vi.fn(), signOut: vi.fn() }),
}));
vi.mock("convex/react", () => ({
  useQuery: () => ({ balanceCents: 600 }),
  useMutation: () => vi.fn().mockResolvedValue(undefined),
}));

const originalMatchMedia = window.matchMedia;
Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });

describe("account action disclosure", () => {
  afterEach(() => cleanup());

  it("exposes expanded state and closes on Escape with focus restored", () => {
    render(<AppHeader />);
    const trigger = screen.getByRole("button", { name: "Account actions" });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("group", { name: "Account actions" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });
});

afterAll(() => Object.defineProperty(window, "matchMedia", { configurable: true, value: originalMatchMedia }));
