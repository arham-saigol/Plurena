import { v, type Infer } from "convex/values";

export const PANEL_VERSION = "audience-simulation-v1" as const;

export const audienceValidator = v.object({
  name: v.optional(v.string()),
  locations: v.array(v.string()),
  description: v.string(),
  gender: v.union(v.literal("female"), v.literal("mixed"), v.literal("male")),
  minAge: v.number(),
  maxAge: v.number(),
});

export const decisionCriterionValidator = v.object({
  criterion: v.string(),
  weight: v.number(),
});

export const segmentBlueprintValidator = v.object({
  name: v.string(),
  targetShare: v.number(),
  summary: v.string(),
  categoryExperience: v.union(v.literal("low"), v.literal("moderate"), v.literal("high"), v.literal("expert")),
  usageContext: v.string(),
  currentSolution: v.string(),
  purchaseStage: v.string(),
  goals: v.array(v.string()),
  painPoints: v.array(v.string()),
  triggers: v.array(v.string()),
  constraints: v.array(v.string()),
  priorBeliefs: v.array(v.string()),
  evidenceThresholds: v.array(v.string()),
  uncertainties: v.array(v.string()),
  decisionCriteria: v.array(decisionCriterionValidator),
});

export const audienceBlueprintValidator = v.object({
  version: v.literal(PANEL_VERSION),
  audienceInterpretation: v.string(),
  researchContext: v.string(),
  assumptions: v.array(v.string()),
  variationDimensions: v.array(v.string()),
  segments: v.array(segmentBlueprintValidator),
});

export const personaProfileValidator = v.object({
  segmentName: v.string(),
  categoryExperience: v.union(v.literal("low"), v.literal("moderate"), v.literal("high"), v.literal("expert")),
  usageContext: v.string(),
  currentSolution: v.string(),
  purchaseStage: v.string(),
  goals: v.array(v.string()),
  painPoints: v.array(v.string()),
  trigger: v.string(),
  decisionCriteria: v.array(decisionCriterionValidator),
  constraints: v.array(v.string()),
  priorBeliefs: v.array(v.string()),
  evidenceThreshold: v.string(),
  uncertainties: v.array(v.string()),
  responseStyle: v.union(
    v.literal("brief_direct"),
    v.literal("reflective"),
    v.literal("analytical"),
    v.literal("conversational"),
    v.literal("uncertain"),
  ),
  pointOfView: v.string(),
});

export const generatedProfileValidator = v.object({
  ordinal: v.number(),
  profile: personaProfileValidator,
});

export type AudienceCriteria = Infer<typeof audienceValidator>;
export type AudienceBlueprint = Infer<typeof audienceBlueprintValidator>;
export type PersonaProfile = Infer<typeof personaProfileValidator>;
export type GeneratedProfile = Infer<typeof generatedProfileValidator>;

export type PanelSlot = {
  ordinal: number;
  age: number;
  location: string;
  gender: "female" | "male" | "nonbinary";
};

export type ProfileSlot = PanelSlot & { segmentName: string };

export function hashSeed(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomFrom(seed: number) {
  let state = seed || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function genderAt(setting: AudienceCriteria["gender"], ordinal: number) {
  if (setting === "female") return "female" as const;
  if (setting === "male") return "male" as const;
  if (ordinal % 10 === 9) return "nonbinary" as const;
  return ordinal % 2 === 0 ? "female" as const : "male" as const;
}

export function generatePanelSlots(criteria: AudienceCriteria, size: number, seed = "plurena"): PanelSlot[] {
  if (size < 1) throw new Error("INVALID_PANEL_SIZE");
  if (!criteria.locations.length) throw new Error("LOCATION_REQUIRED");
  if (criteria.minAge < 18 || criteria.maxAge > 80 || criteria.minAge > criteria.maxAge) throw new Error("INVALID_AGE_RANGE");
  const random = randomFrom(hashSeed(seed));
  const span = criteria.maxAge - criteria.minAge + 1;
  const ages = shuffleForRespondent(Array.from({ length: size }, (_, ordinal) =>
    Math.min(criteria.maxAge, criteria.minAge + Math.floor(((ordinal + random()) / size) * span)),
  ), `${seed}:ages`);
  const locations = shuffleForRespondent(Array.from({ length: size }, (_, ordinal) =>
    criteria.locations[ordinal % criteria.locations.length],
  ), `${seed}:locations`);
  const genders = shuffleForRespondent(Array.from({ length: size }, (_, ordinal) =>
    genderAt(criteria.gender, ordinal),
  ), `${seed}:genders`);

  return Array.from({ length: size }, (_, ordinal) => ({
    ordinal,
    age: ages[ordinal],
    location: locations[ordinal],
    gender: genders[ordinal],
  }));
}

export function assignSegments(blueprint: AudienceBlueprint, slots: PanelSlot[], seed: string): ProfileSlot[] {
  if (blueprint.segments.length < 2) throw new Error("INSUFFICIENT_AUDIENCE_SEGMENTS");
  const totalShare = blueprint.segments.reduce((sum, segment) => sum + segment.targetShare, 0);
  if (totalShare <= 0) throw new Error("INVALID_SEGMENT_SHARES");
  const allocations = blueprint.segments.map((segment, index) => {
    const exact = (segment.targetShare / totalShare) * slots.length;
    return { index, name: segment.name, count: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let remaining = slots.length - allocations.reduce((sum, allocation) => sum + allocation.count, 0);
  for (const allocation of [...allocations].sort((a, b) => b.remainder - a.remainder || a.index - b.index)) {
    if (!remaining) break;
    allocation.count += 1;
    remaining -= 1;
  }
  const names = allocations.flatMap((allocation) => Array.from({ length: allocation.count }, () => allocation.name));
  const shuffledNames = shuffleForRespondent(names, `${seed}:segments`);
  return slots.map((slot, index) => ({ ...slot, segmentName: shuffledNames[index] }));
}

function uniqueClean(values: string[], minimum: number, field: string) {
  const cleaned = [...new Map(values.map((value) => [value.trim().toLowerCase(), value.trim()])).values()].filter(Boolean);
  if (cleaned.length < minimum) throw new Error(`PROFILE_${field.toUpperCase()}_TOO_THIN`);
  return cleaned;
}

export function normalizeDecisionCriteria(criteria: PersonaProfile["decisionCriteria"]) {
  const cleaned = criteria.map((item) => ({ criterion: item.criterion.trim(), weight: Math.max(1, item.weight) }));
  const total = cleaned.reduce((sum, item) => sum + item.weight, 0);
  if (!total || cleaned.length < 3) throw new Error("PROFILE_DECISION_CRITERIA_TOO_THIN");
  const normalized = cleaned.map((item, index) => {
    const exact = (item.weight / total) * 100;
    return { criterion: item.criterion, weight: Math.max(1, Math.floor(exact)), remainder: exact - Math.floor(exact), index };
  });
  let difference = 100 - normalized.reduce((sum, item) => sum + item.weight, 0);
  if (difference > 0) {
    const order = [...normalized].sort((a, b) => b.remainder - a.remainder || a.index - b.index);
    for (let index = 0; difference > 0; index = (index + 1) % order.length) {
      order[index].weight += 1;
      difference -= 1;
    }
  } else if (difference < 0) {
    const order = [...normalized].sort((a, b) => b.weight - a.weight || a.index - b.index);
    for (let index = 0; difference < 0; index = (index + 1) % order.length) {
      if (order[index].weight <= 1) continue;
      order[index].weight -= 1;
      difference += 1;
    }
  }
  return normalized.sort((a, b) => a.index - b.index).map(({ criterion, weight }) => ({ criterion, weight }));
}

export function finalizePanelProfiles(slots: ProfileSlot[], generated: GeneratedProfile[]): GeneratedProfile[] {
  if (generated.length !== slots.length) throw new Error("INCOMPLETE_GENERATED_PANEL");
  const slotByOrdinal = new Map(slots.map((slot) => [slot.ordinal, slot]));
  const seenOrdinals = new Set<number>();
  const seenProfiles = new Set<string>();

  const finalized = generated.map(({ ordinal, profile }) => {
    const slot = slotByOrdinal.get(ordinal);
    if (!slot || seenOrdinals.has(ordinal)) throw new Error("INVALID_PROFILE_ORDINAL");
    if (profile.segmentName.trim() !== slot.segmentName) throw new Error("PROFILE_SEGMENT_MISMATCH");
    seenOrdinals.add(ordinal);
    const cleaned: PersonaProfile = {
      ...profile,
      segmentName: profile.segmentName.trim(),
      usageContext: profile.usageContext.trim(),
      currentSolution: profile.currentSolution.trim(),
      purchaseStage: profile.purchaseStage.trim(),
      goals: uniqueClean(profile.goals, 2, "goals"),
      painPoints: uniqueClean(profile.painPoints, 2, "pain_points"),
      trigger: profile.trigger.trim(),
      decisionCriteria: normalizeDecisionCriteria(profile.decisionCriteria),
      constraints: uniqueClean(profile.constraints, 2, "constraints"),
      priorBeliefs: uniqueClean(profile.priorBeliefs, 1, "prior_beliefs"),
      evidenceThreshold: profile.evidenceThreshold.trim(),
      uncertainties: uniqueClean(profile.uncertainties, 1, "uncertainties"),
      pointOfView: profile.pointOfView.trim(),
    };
    if (!cleaned.usageContext || !cleaned.currentSolution || !cleaned.purchaseStage || !cleaned.trigger || !cleaned.evidenceThreshold || !cleaned.pointOfView) {
      throw new Error("INCOMPLETE_PROFILE_CONTEXT");
    }
    const signature = JSON.stringify({
      segmentName: cleaned.segmentName.toLowerCase(),
      currentSolution: cleaned.currentSolution.toLowerCase(),
      goals: cleaned.goals.map((item) => item.toLowerCase()),
      constraints: cleaned.constraints.map((item) => item.toLowerCase()),
      priorBeliefs: cleaned.priorBeliefs.map((item) => item.toLowerCase()),
      pointOfView: cleaned.pointOfView.toLowerCase(),
    });
    if (seenProfiles.has(signature)) throw new Error("DUPLICATE_GENERATED_PROFILE");
    seenProfiles.add(signature);
    return { ordinal, profile: cleaned };
  });

  if (seenOrdinals.size !== slots.length) throw new Error("INCOMPLETE_GENERATED_PANEL");
  return finalized.sort((a, b) => a.ordinal - b.ordinal);
}

export function legacyPersonaFields(profile: PersonaProfile) {
  return {
    interests: profile.goals.slice(0, 3),
    habits: [profile.usageContext, `Currently uses: ${profile.currentSolution}`],
    constraints: profile.constraints.slice(0, 3),
    pointOfView: profile.pointOfView,
  };
}

export function shuffleForRespondent<T>(values: readonly T[], seed: string): T[] {
  const result = [...values];
  const random = randomFrom(hashSeed(seed));
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(random() * (index + 1));
    [result[index], result[swapWith]] = [result[swapWith], result[index]];
  }
  return result;
}
