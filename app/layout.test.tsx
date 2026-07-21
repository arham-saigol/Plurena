import { Children, isValidElement } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  DM_Sans: () => ({ variable: "--font-dm-sans" }),
}));

vi.mock("@/components/providers", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

import RootLayout from "./layout";

describe("RootLayout", () => {
  it("allows browser extensions to add body attributes before hydration", () => {
    const layout = RootLayout({ children: null });
    const body = Children.only(layout.props.children);

    expect(isValidElement(body)).toBe(true);
    expect(body.props.suppressHydrationWarning).toBe(true);
  });
});
