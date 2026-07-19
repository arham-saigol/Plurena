import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireOwnedTest } from "./lib/auth";
import { confidenceValidator } from "./lib/validators";

export const list = query({
  args: {
    testId: v.id("tests"),
    confidence: v.optional(confidenceValidator),
    selectedOptionId: v.optional(v.id("snapshotOptions")),
  },
  handler: async (ctx, args) => {
    await requireOwnedTest(ctx, args.testId);
    const responses = await ctx.db
      .query("responses")
      .withIndex("by_testId_and_completedAt", (q) =>
        q.eq("testId", args.testId),
      )
      .order("desc")
      .take(300);
    const filtered = responses.filter(
      (response) =>
        (!args.confidence || response.confidence === args.confidence) &&
        (!args.selectedOptionId ||
          response.selectedOptionId === args.selectedOptionId),
    );
    return await Promise.all(
      filtered.map(async (response) => {
        const persona = await ctx.db.get("personas", response.personaId);
        const option = await ctx.db.get(
          "snapshotOptions",
          response.selectedOptionId,
        );
        if (!persona || !option) return null;
        return {
          id: response._id,
          runId: response.runId,
          persona: {
            id: persona._id,
            displayName: persona.displayName,
            background: persona.background,
            goals: persona.goals,
            motivations: persona.motivations,
            frustrations: persona.frustrations,
            decisionDrivers: persona.decisionDrivers,
            familiarity: persona.familiarity,
            behavioralTraits: persona.behavioralTraits,
            reasoningStyle: persona.reasoningStyle,
            priceSensitivity: persona.priceSensitivity,
            soul: persona.soul,
          },
          selection: { id: option._id, label: option.label },
          reasons: response.reasons,
          comparisons: response.comparisons,
          objection: response.objection,
          confidence: response.confidence,
          confidenceScore: response.confidenceScore,
          completedAt: response.completedAt,
        };
      }),
    ).then((rows) => rows.filter((row) => row !== null));
  },
});
