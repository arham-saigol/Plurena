// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Dashboard } from "@/components/dashboard";
import { TestDetails } from "@/components/test-details";
import DashboardError from "@/app/(app)/dashboard/error";
import TestError from "@/app/(app)/tests/[id]/error";
import NotFound from "@/app/not-found";
import { SetupRequired } from "@/components/setup-required";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  usePaginatedQuery: vi.fn(),
}));

vi.mock("convex/react", () => ({ useQuery: mocks.useQuery, usePaginatedQuery: mocks.usePaginatedQuery }));
vi.mock("@/components/app-header", () => ({ AppHeader: () => <header>Header</header> }));
vi.mock("@/components/new-test-dialog", () => ({ NewTestDialog: () => <div role="dialog" aria-label="New test flow" /> }));
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

  it("opens the test creation flow from the dashboard action", () => {
    render(<Dashboard />);
    fireEvent.click(screen.getAllByRole("button", { name: "New test" })[0]);
    expect(screen.getByRole("dialog", { name: "New test flow" })).toBeInTheDocument();
  });

  it("uses page headings in full-page state cards", () => {
    const { rerender } = render(<DashboardError reset={vi.fn()} />);
    expect(screen.getByRole("heading", { level: 1, name: "Dashboard unavailable" })).toBeInTheDocument();

    rerender(<TestError reset={vi.fn()} />);
    expect(screen.getByRole("heading", { level: 1, name: "Results unavailable" })).toBeInTheDocument();

    rerender(<NotFound />);
    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeInTheDocument();

    rerender(<SetupRequired />);
    expect(screen.getByRole("heading", { level: 1, name: "Connect Convex to continue" })).toBeInTheDocument();
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

  it("never shows provider or model details on respondent cards", () => {
    mocks.usePaginatedQuery.mockReturnValue({
      results: [{
        _id: "response-1",
        answer: "A private answer",
        feedback: ["A useful observation"],
        provider: "hidden-provider",
        model: "hidden-model",
        persona: {
          ordinal: 0,
          age: 32,
          location: "US",
          gender: "female",
          pointOfView: "Practical buyer",
          interests: ["design"],
          constraints: ["budget"],
        },
      }],
      status: "Exhausted",
      loadMore: vi.fn(),
    });

    render(<TestDetails testId="test-1" />);
    fireEvent.click(screen.getByRole("button", { name: /Responses/ }));

    expect(screen.getByText("A private answer")).toBeInTheDocument();
    expect(screen.queryByText("hidden-provider")).not.toBeInTheDocument();
    expect(screen.queryByText("hidden-model")).not.toBeInTheDocument();
  });

  it("distinguishes a filtered empty result from an empty account", async () => {
    render(<Dashboard />);
    expect(screen.getByRole("heading", { name: "No tests yet" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "completed" } });
    await waitFor(() => expect(screen.getByRole("heading", { name: "No tests match these filters" })).toBeInTheDocument());
  });
});
