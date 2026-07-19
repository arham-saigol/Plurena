import { z } from "zod";

export const personaSchema = z.object({
  displayName: z.string().min(2).max(60),
  background: z.string().min(20).max(600),
  goals: z.array(z.string().min(3).max(180)).min(1).max(4),
  motivations: z.array(z.string().min(3).max(180)).min(1).max(4),
  frustrations: z.array(z.string().min(3).max(180)).min(1).max(4),
  decisionDrivers: z.array(z.string().min(3).max(180)).min(1).max(5),
  familiarity: z.enum([
    "unfamiliar",
    "aware",
    "considering",
    "experienced",
    "expert",
  ]),
  behavioralTraits: z.array(z.string().min(3).max(120)).min(2).max(5),
  reasoningStyle: z.string().min(10).max(250),
  priceSensitivity: z.string().min(5).max(180),
  soul: z.string().min(30).max(500),
});

export type PersonaOutput = z.infer<typeof personaSchema>;

export const personaBatchSchema = z.object({
  personas: z.array(personaSchema),
});

export const respondentResultSchema = z.object({
  selectedOptionPosition: z.number().int().nonnegative(),
  reasons: z.array(z.string().min(5).max(400)).min(3).max(4),
  comparisons: z.array(z.string().min(5).max(400)).min(1).max(4),
  confidence: z.enum(["low", "medium", "high"]),
  confidenceScore: z.number().min(0).max(1),
  objection: z.string().min(3).max(400).nullable(),
});

export const groupSummarySchema = z.object({
  summary: z.string().min(20).max(2_500),
  themes: z.array(z.string().min(5).max(300)).max(10),
  objections: z.array(z.string().min(5).max(300)).max(10),
  segmentSignals: z.array(z.string().min(5).max(350)).max(8),
});

export const finalNarrativeSchema = z.object({
  executiveSummary: z.string().min(40).max(2_000),
  winningReasons: z.array(z.string().min(5).max(350)).max(8),
  optionInsights: z.array(
    z.object({
      optionPosition: z.number().int().nonnegative(),
      strengths: z.array(z.string().min(5).max(300)).max(6),
      weaknesses: z.array(z.string().min(5).max(300)).max(6),
      recommendations: z.array(z.string().min(5).max(300)).min(1).max(6),
    }),
  ),
  objections: z.array(z.string().min(5).max(350)).max(10),
  segments: z
    .array(
      z.object({
        name: z.string().min(3).max(100),
        pattern: z.string().min(10).max(400),
        evidence: z.string().min(10).max(400),
      }),
    )
    .max(8),
  disagreements: z.array(z.string().min(5).max(350)).max(8),
  implications: z.array(z.string().min(5).max(350)).max(8),
  nextTests: z.array(z.string().min(5).max(350)).min(1).max(6),
  limitations: z.array(z.string().min(5).max(350)).min(1).max(6),
});
