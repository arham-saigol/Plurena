export type AudienceCriteria = {
  locations: string[];
  description: string;
  gender: "female" | "mixed" | "male";
  minAge: number;
  maxAge: number;
};

export type GeneratedPersona = {
  ordinal: number;
  age: number;
  location: string;
  gender: "female" | "male" | "nonbinary";
  interests: string[];
  habits: string[];
  constraints: string[];
  pointOfView: string;
};

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

const HABITS = [
  "compares reviews before buying",
  "notices price and effort first",
  "shares useful finds with friends",
  "uses mobile apps during short breaks",
  "returns to familiar brands",
  "researches unfamiliar claims",
];
const CONSTRAINTS = [
  "limited time",
  "fixed monthly budget",
  "low tolerance for unclear language",
  "needs proof before switching",
  "prefers simple setup",
  "avoids unnecessary purchases",
];
const VIEWS = [
  "practical and value-conscious",
  "curious but skeptical of marketing claims",
  "design-aware and detail-oriented",
  "time-conscious and decisive",
  "cautious about unfamiliar products",
  "enthusiastic when benefits feel concrete",
];

function interestWords(description: string) {
  const words = description
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !["with", "that", "from", "interested", "buyers", "people"].includes(word));
  return [...new Set(words)].slice(0, 6);
}

function genderAt(setting: AudienceCriteria["gender"], ordinal: number) {
  if (setting === "female") return "female";
  if (setting === "male") return "male";
  if (ordinal % 10 === 9) return "nonbinary";
  return ordinal % 2 === 0 ? "female" : "male";
}

export function generatePanel(criteria: AudienceCriteria, size: number, seed = "plurena"): GeneratedPersona[] {
  if (size < 1) throw new Error("INVALID_PANEL_SIZE");
  if (!criteria.locations.length) throw new Error("LOCATION_REQUIRED");
  if (criteria.minAge < 18 || criteria.maxAge > 80 || criteria.minAge > criteria.maxAge) throw new Error("INVALID_AGE_RANGE");
  const random = randomFrom(hashSeed(seed));
  const interests = interestWords(criteria.description);
  const span = criteria.maxAge - criteria.minAge + 1;
  const locationCycle = shuffleForRespondent(criteria.locations, `${seed}:locations`);

  return Array.from({ length: size }, (_, ordinal) => {
    const ageBandPosition = (ordinal + random()) / size;
    const age = Math.min(criteria.maxAge, criteria.minAge + Math.floor(ageBandPosition * span));
    const location = locationCycle[ordinal % locationCycle.length];
    const interest = interests.length ? interests[ordinal % interests.length] : "consumer choices";
    return {
      ordinal,
      age,
      location,
      gender: genderAt(criteria.gender, ordinal),
      interests: [interest, interests[(ordinal + 2) % Math.max(interests.length, 1)] ?? "new products"],
      habits: [HABITS[ordinal % HABITS.length], HABITS[(ordinal + 3) % HABITS.length]],
      constraints: [CONSTRAINTS[(ordinal + 1) % CONSTRAINTS.length]],
      pointOfView: VIEWS[(ordinal + Math.floor(random() * VIEWS.length)) % VIEWS.length],
    };
  });
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
