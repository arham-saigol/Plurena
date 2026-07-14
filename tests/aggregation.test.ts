import { describe, expect, it } from "vitest";
import { aggregateComparison, aggregateOpenEnded } from "@/convex/lib/aggregation";

describe("result aggregation", () => {
  it("ranks votes, keeps none-of-the-above, and calculates share", () => {
    const result = aggregateComparison(["a", "b"], [
      { choiceOptionId: "b", feedback: [] }, { choiceOptionId: "b", feedback: [] },
      { choiceOptionId: "a", feedback: [] }, { feedback: ["Neither works"] },
    ]);
    expect(result.winnerOptionId).toBe("b");
    expect(result.ranked[0]).toMatchObject({ optionId: "b", votes: 2, share: 50 });
    expect(result.noneOfAbove).toBe(1);
  });
  it("does not invent a winner for a tie or when None of the above leads", () => {
    const tie = aggregateComparison(["a", "b"], [
      { choiceOptionId: "a", feedback: [] },
      { choiceOptionId: "b", feedback: [] },
    ]);
    expect(tie.winnerOptionId).toBeUndefined();
    expect(tie.tiedLeaderOptionIds).toEqual(["a", "b"]);

    const noneLeads = aggregateComparison(["a", "b"], [
      { choiceOptionId: "a", feedback: [] },
      { feedback: [] },
      { feedback: [] },
    ]);
    expect(noneLeads.winnerOptionId).toBeUndefined();
    expect(noneLeads.noneOfAboveLed).toBe(true);
  });

  it("keeps open answers and reports repeated concrete terms", () => {
    const result = aggregateOpenEnded([
      { answer: "Price and setup time matter", feedback: [] },
      { answer: "The price feels high", feedback: [] },
      { answer: "Setup needs a clear guide", feedback: [] },
    ]);
    expect(result.total).toBe(3);
    expect(result.commonTerms.find((item) => item.term === "price")?.count).toBe(2);
  });
});
