// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Dashboard } from "@/components/dashboard";
import { TestDetails } from "@/components/test-details";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  usePaginatedQuery: vi.fn(),
}));

vi.mock("convex/react", () => ({ useQuery: mocks.useQuery, usePaginatedQuery: mocks.usePaginatedQuery }));
vi.mock("@/components/app-header", () => ({ AppHeader: () => <header>Header</header> }));
vi.mock("@/components/new-test-dialog", () => ({ NewTestDialog: () => null }));
vi.mock("@/components/onboarding-dialog", () => ({ OnboardingDialog: () => null }));

const me = { _id: "user-1", balanceCents: 600, onboardingClaimedAt: Date.now() };
const failedDetail = {
  test: {
    _id: "test-1",
    title: "Failed research test",
    testType: "question",
    status: "failed",
    panelSize: 20,
    priceCents: 500,
    completedCount: 0,
    failedCount: 20,
    launchedAt: Date.now(),
    audience: { description: "Buyers", locations: ["US"], minAge: 20, maxAge: 40, gender: "mixed" },
    reusedPanel: false,
  },
  options: [],
  aggregate: null,
  synthesis: null,
};

describe("critical UI states", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    mocks.usePaginatedQuery.mockReturnValue({ results: [], status: "Exhausted", loadMore: vi.fn() });
    mocks.useQuery.mockImplementation((reference: any) => {
      const name = getFunctionName(reference);
      if (name === "users:me") return me;
      if (name === "tests:get") return failedDetail;
      if (name === "pricing:getConfig") return { version: "panel-v1", panels: [{ size: 20, priceCents: 500, discountPercent: 0 }] };
      if (name === "tests:list") return [];
      return undefined;
    });
  });

  it("uses terminal copy instead of saying a failed test is awaiting responses", () => {
    render(<TestDetails testId="test-1" />);
    fireEvent.click(screen.getByRole("button", { name: /Responses/ }));
    expect(screen.getByRole("heading", { name: "No responses were completed" })).toBeInTheDocument();
    expect(screen.queryByText("Awaiting responses")).not.toBeInTheDocument();
  });

  it("announces export failures", async () => {
    const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");
    try {
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("Clipboard permission denied")) } });
      render(<TestDetails testId="test-1" />);
      fireEvent.click(screen.getByRole("button", { name: /Copy as Markdown/ }));
      expect(await screen.findByRole("alert")).toHaveTextContent("Clipboard permission denied");
    } finally {
      if (clipboardDescriptor) Object.defineProperty(navigator, "clipboard", clipboardDescriptor);
      else delete (navigator as { clipboard?: Clipboard }).clipboard;
    }
  });

  it("distinguishes a filtered empty result from an empty account", async () => {
    render(<Dashboard />);
    expect(screen.getByRole("heading", { name: "No tests yet" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "completed" } });
    await waitFor(() => expect(screen.getByRole("heading", { name: "No tests match these filters" })).toBeInTheDocument());
  });
});
