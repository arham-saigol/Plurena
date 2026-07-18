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
  useQuery: () => Object.assign([], { balanceCents: 600 }),
  useMutation: () => vi.fn().mockResolvedValue(undefined),
}));

const originalMatchMedia = window.matchMedia;
Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });

describe("app header", () => {
  afterEach(() => cleanup());

  it("exposes expanded state and closes on Escape with focus restored", () => {
    render(<AppHeader />);
    const trigger = screen.getByRole("button", { name: "Account actions" });
    expect(trigger).toHaveClass("account-trigger");
    expect(trigger.querySelector('[data-slot="avatar"]')).toHaveClass("account-avatar");
    expect(trigger.querySelector("svg")).not.toBeInTheDocument();
    const header = trigger.closest("header");
    expect(header).not.toHaveClass("border-b");
    expect(header?.firstElementChild).toHaveClass("w-full");
    expect(header?.firstElementChild).not.toHaveClass("max-w-6xl");
    expect(screen.queryByText("Tests")).not.toBeInTheDocument();
    expect(header?.querySelector('[aria-hidden="true"]')).not.toBeInTheDocument();
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("group", { name: "Account actions" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("selects a custom top-up in $5 increments within the supported range", () => {
    render(<AppHeader />);
    fireEvent.click(screen.getByRole("button", { name: /Balance/ }));

    const decrease = screen.getByRole("button", { name: "Decrease top-up amount by $5" });
    const increase = screen.getByRole("button", { name: "Increase top-up amount by $5" });
    expect(screen.getByRole("status", { name: "Selected top-up amount" })).toHaveTextContent("$10.00");

    fireEvent.click(decrease);
    expect(screen.getByRole("status", { name: "Selected top-up amount" })).toHaveTextContent("$5.00");
    expect(decrease).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "$100.00" }));
    expect(screen.getByRole("status", { name: "Selected top-up amount" })).toHaveTextContent("$100.00");

    for (let index = 0; index < 80; index += 1) fireEvent.click(increase);
    expect(screen.getByRole("status", { name: "Selected top-up amount" })).toHaveTextContent("$500.00");
    expect(increase).toBeDisabled();
  });
});

afterAll(() => Object.defineProperty(window, "matchMedia", { configurable: true, value: originalMatchMedia }));
