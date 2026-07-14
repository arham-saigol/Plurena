import { describe, expect, it } from "vitest";
import { shuffleForRespondent } from "@/convex/lib/panel";

describe("respondent option randomization", () => {
  const options = ["A", "B", "C", "D", "E"];
  it("preserves every option exactly once", () => {
    expect(shuffleForRespondent(options, "r1").sort()).toEqual(options);
  });
  it("is stable per respondent and varies across the panel", () => {
    const first = shuffleForRespondent(options, "test:1");
    expect(shuffleForRespondent(options, "test:1")).toEqual(first);
    const orders = new Set(Array.from({ length: 20 }, (_, index) => shuffleForRespondent(options, `test:${index}`).join("")));
    expect(orders.size).toBeGreaterThan(5);
  });
});
