import { describe, expect, it } from "vitest";
import { generatePanel } from "@/convex/lib/panel";

const audience = { locations: ["US", "Canada", "UK"], description: "Amazon buyers interested in coffee equipment and careful product reviews", gender: "mixed" as const, minAge: 21, maxAge: 65 };

describe("persona panel distribution", () => {
  it("generates stable personas with required research attributes", () => {
    const first = generatePanel(audience, 30, "test-a");
    expect(generatePanel(audience, 30, "test-a")).toEqual(first);
    expect(first).toHaveLength(30);
    for (const persona of first) {
      expect(persona.age).toBeGreaterThanOrEqual(21);
      expect(persona.age).toBeLessThanOrEqual(65);
      expect(persona.interests.length).toBeGreaterThan(0);
      expect(persona.habits.length).toBeGreaterThan(0);
      expect(persona.constraints.length).toBeGreaterThan(0);
      expect(persona.pointOfView).toBeTruthy();
    }
  });
  it("honors exclusive Female and Male audience endpoints", () => {
    expect(new Set(generatePanel({ ...audience, gender: "female" }, 20, "female").map((persona) => persona.gender))).toEqual(new Set(["female"]));
    expect(new Set(generatePanel({ ...audience, gender: "male" }, 20, "male").map((persona) => persona.gender))).toEqual(new Set(["male"]));
  });

  it("balances locations and mixed gender across the panel", () => {
    const panel = generatePanel(audience, 30, "test-b");
    const locations = Object.groupBy(panel, (persona) => persona.location);
    expect(Object.values(locations).map((rows) => rows?.length).sort()).toEqual([10, 10, 10]);
    const genders = Object.groupBy(panel, (persona) => persona.gender);
    expect(genders.female?.length).toBeGreaterThanOrEqual(12);
    expect(genders.male?.length).toBeGreaterThanOrEqual(12);
    expect(genders.nonbinary?.length).toBeGreaterThan(0);
  });
});
