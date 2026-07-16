// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NewTestDialog } from "@/components/new-test-dialog";

vi.mock("convex/react", () => ({
  useAction: () => vi.fn(),
  useMutation: () => vi.fn(),
  useQuery: () => [],
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const pricing = {
  version: "panel-v1",
  panels: [
    { size: 20, priceCents: 500, discountPercent: 0 },
    { size: 50, priceCents: 1125, discountPercent: 10 },
  ],
};

describe("test creation dialog", () => {
  afterEach(() => cleanup());

  it("shows readable study choices and advances through the wizard", () => {
    render(<NewTestDialog pricing={pricing} balanceCents={2_000} onClose={vi.fn()} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Type" })).toBeVisible();
    expect(screen.getByRole("button", { name: /Compare concepts/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/Test 2 to 5 pieces/)).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));

    expect(screen.getByRole("heading", { name: "Content" })).toBeVisible();
    expect(screen.getByLabelText("Header question")).toBeVisible();
    expect(screen.getAllByLabelText(/Option \d label/)).toHaveLength(2);
  });

  it("keeps a typed location separator so multiple locations can be entered", () => {
    render(<NewTestDialog pricing={pricing} balanceCents={2_000} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    fireEvent.change(screen.getByLabelText("Header question"), { target: { value: "Which option wins?" } });
    for (const option of screen.getAllByPlaceholderText("Paste the copy or concept to test")) {
      fireEvent.change(option, { target: { value: "Option content" } });
    }
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));

    const locations = screen.getByLabelText("Target locations");
    fireEvent.change(locations, { target: { value: "United States," } });
    expect(locations).toHaveValue("United States, ");
  });

  it("renders one gender thumb and distinctly labels both age thumbs", () => {
    render(<NewTestDialog pricing={pricing} balanceCents={2_000} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    fireEvent.change(screen.getByLabelText("Header question"), { target: { value: "Which option wins?" } });
    for (const option of screen.getAllByPlaceholderText("Paste the copy or concept to test")) {
      fireEvent.change(option, { target: { value: "Option content" } });
    }
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));

    const thumbs = screen.getByRole("dialog").querySelectorAll<HTMLInputElement>('input[type="range"]');
    expect(thumbs).toHaveLength(3);
    expect(Array.from(thumbs, (thumb) => thumb.getAttribute("aria-label"))).toEqual([
      "Gender mix",
      "Minimum age",
      "Maximum age",
    ]);
  });
});
