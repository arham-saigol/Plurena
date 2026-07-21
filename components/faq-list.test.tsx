// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FaqList } from "./faq-list";

afterEach(cleanup);

describe("FaqList", () => {
  it("animates every repeated open and close", () => {
    render(<FaqList items={[{ question: "Question?", answer: "Answer." }]} />);

    const button = screen.getByRole("button", { name: "Question?" });
    const answer = document.getElementById(
      button.getAttribute("aria-controls")!,
    );

    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(answer).toHaveClass("grid-rows-[0fr]");

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(answer).toHaveClass("grid-rows-[1fr]");

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(answer).toHaveClass("grid-rows-[0fr]");

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(answer).toHaveClass("grid-rows-[1fr]");
  });
});
