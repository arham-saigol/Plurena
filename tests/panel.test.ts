import { describe, expect, it } from "vitest";
import {
  PANEL_VERSION,
  assignSegments,
  finalizePanelProfiles,
  generatePanelSlots,
  type AudienceBlueprint,
  type GeneratedProfile,
} from "@/convex/lib/panel";
import { blueprintOutputSchema, finalizeBlueprint } from "@/convex/lib/panelGeneration";

const audience = { locations: ["US", "Canada", "UK"], description: "Amazon buyers interested in coffee equipment and careful product reviews", gender: "mixed" as const, minAge: 21, maxAge: 65 };
const blueprint: AudienceBlueprint = {
  version: PANEL_VERSION,
  audienceInterpretation: "Online coffee-equipment buyers at different experience and purchase stages.",
  researchContext: "Choosing home coffee equipment.",
  assumptions: ["The brief does not specify an exact purchase horizon."],
  variationDimensions: ["experience", "current setup", "evidence threshold"],
  segments: [
    {
      name: "New category explorers", targetShare: 30, summary: "New buyers learning the category.", categoryExperience: "low",
      usageContext: "Makes coffee at home on weekdays", currentSolution: "Pre-ground coffee and a basic brewer", purchaseStage: "early research",
      goals: ["Improve consistency", "Understand the basics"], painPoints: ["Unclear terminology", "Too many choices"], triggers: ["Current coffee tastes inconsistent"], constraints: ["Limited counter space", "Moderate budget"], priorBeliefs: ["Complex equipment may be hard to use"], evidenceThresholds: ["Clear demonstrations"], uncertainties: ["Which specifications matter"], decisionCriteria: [{ criterion: "ease", weight: 40 }, { criterion: "proof", weight: 35 }, { criterion: "price", weight: 25 }],
    },
    {
      name: "Active upgraders", targetShare: 45, summary: "Existing users comparing a better setup.", categoryExperience: "moderate",
      usageContext: "Brews daily", currentSolution: "Entry-level machine", purchaseStage: "actively comparing",
      goals: ["Improve quality", "Reduce inconsistency"], painPoints: ["Uneven results", "Cleaning effort"], triggers: ["Current machine is wearing out"], constraints: ["Fixed budget", "Short morning routine"], priorBeliefs: ["Better equipment should show a noticeable result"], evidenceThresholds: ["Owner reviews and warranty"], uncertainties: ["Whether premium features matter"], decisionCriteria: [{ criterion: "quality", weight: 45 }, { criterion: "effort", weight: 30 }, { criterion: "price", weight: 25 }],
    },
    {
      name: "Experienced optimizers", targetShare: 25, summary: "Experienced users refining an established routine.", categoryExperience: "high",
      usageContext: "Experiments with recipes", currentSolution: "Mid-range setup", purchaseStage: "selective consideration",
      goals: ["Gain more control", "Improve repeatability"], painPoints: ["Limited adjustment", "Inconsistent measurements"], triggers: ["A specific limitation blocks progress"], constraints: ["Won't pay for cosmetic upgrades", "Keeps an established workflow"], priorBeliefs: ["Specifications need real-world evidence"], evidenceThresholds: ["Detailed tests"], uncertainties: ["Long-term reliability"], decisionCriteria: [{ criterion: "control", weight: 45 }, { criterion: "reliability", weight: 35 }, { criterion: "price", weight: 20 }],
    },
  ],
};

describe("audience panel design", () => {
  it("creates stable, balanced demographic slots without canned behavioral traits", () => {
    const first = generatePanelSlots(audience, 30, "test-a");
    expect(generatePanelSlots(audience, 30, "test-a")).toEqual(first);
    expect(first).toHaveLength(30);
    expect(Object.values(Object.groupBy(first, (slot) => slot.location)).map((rows) => rows?.length).sort()).toEqual([10, 10, 10]);
    for (const slot of first) {
      expect(slot.age).toBeGreaterThanOrEqual(21);
      expect(slot.age).toBeLessThanOrEqual(65);
      expect(slot).not.toHaveProperty("habits");
      expect(slot).not.toHaveProperty("pointOfView");
    }
  });

  it("honors exclusive gender endpoints", () => {
    expect(new Set(generatePanelSlots({ ...audience, gender: "female" }, 20, "female").map((slot) => slot.gender))).toEqual(new Set(["female"]));
    expect(new Set(generatePanelSlots({ ...audience, gender: "male" }, 20, "male").map((slot) => slot.gender))).toEqual(new Set(["male"]));
  });

  it("allocates exact segment quotas and shuffles them stably across demographics", () => {
    const slots = generatePanelSlots(audience, 20, "segments");
    const assigned = assignSegments(blueprint, slots, "segments");
    expect(assignSegments(blueprint, slots, "segments")).toEqual(assigned);
    expect(Object.fromEntries(Object.entries(Object.groupBy(assigned, (slot) => slot.segmentName)).map(([name, rows]) => [name, rows?.length]))).toEqual({
      "New category explorers": 6,
      "Active upgraders": 9,
      "Experienced optimizers": 5,
    });
  });

  it("normalizes segment shares to 100 without dropping a segment", () => {
    const raw = blueprintOutputSchema.parse({
      audienceInterpretation: blueprint.audienceInterpretation,
      researchContext: blueprint.researchContext,
      assumptions: blueprint.assumptions,
      variationDimensions: blueprint.variationDimensions,
      segments: [5, 67, 49, 70, 52, 52].map((targetShare, index) => ({
        ...blueprint.segments[index % blueprint.segments.length],
        name: `Segment ${index + 1}`,
        targetShare,
      })),
    });
    const finalized = finalizeBlueprint(raw);
    expect(finalized.segments.reduce((sum, segment) => sum + segment.targetShare, 0)).toBe(100);
    expect(finalized.segments.every((segment) => segment.targetShare >= 1)).toBe(true);
  });

  it("rejects duplicate generated profiles and normalizes criterion weights", () => {
    const demographicSlots = generatePanelSlots(audience, 2, "quality");
    const slots = demographicSlots.map((slot) => ({ ...slot, segmentName: "Active upgraders" }));
    const profile = (ordinal: number): GeneratedProfile => ({
      ordinal,
      profile: {
        segmentName: slots[ordinal].segmentName,
        categoryExperience: "moderate",
        usageContext: "Brews before work",
        currentSolution: `Entry-level brewer ${ordinal}`,
        purchaseStage: "actively comparing",
        goals: ["Improve consistency", "Reduce cleanup"],
        painPoints: ["Uneven results", "Slow cleanup"],
        trigger: "Current brewer is unreliable",
        decisionCriteria: [{ criterion: "quality", weight: 4 }, { criterion: "effort", weight: 3 }, { criterion: "price", weight: 2 }],
        constraints: ["Limited space", "Fixed budget"],
        priorBeliefs: ["Premium claims need proof"],
        evidenceThreshold: "Independent demonstrations",
        uncertainties: ["Long-term reliability"],
        responseStyle: "analytical",
        pointOfView: `Wants measurable improvement ${ordinal}`,
      },
    });
    const finalized = finalizePanelProfiles(slots, [profile(0), profile(1)]);
    expect(finalized[0].profile.decisionCriteria.reduce((sum, item) => sum + item.weight, 0)).toBe(100);
    const duplicate = profile(1);
    duplicate.profile.currentSolution = profile(0).profile.currentSolution;
    duplicate.profile.pointOfView = profile(0).profile.pointOfView;
    expect(() => finalizePanelProfiles(slots, [profile(0), duplicate])).toThrow("DUPLICATE_GENERATED_PROFILE");
  });
});
