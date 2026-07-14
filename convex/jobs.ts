"use node";

import type { FunctionReference } from "convex/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { z } from "zod";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { MODEL_REGISTRY, routesWithCrossModelFallback, type ModelRoute } from "./lib/modelRegistry";
import { SYNTHESIS_SYSTEM_PROMPT } from "./lib/synthesisGuidance";
import { buildSynthesisResponseEvidence } from "./lib/synthesisEvidence";

const { loadAssignment, startAssignment, recordAttempt, finishAssignment, aggregate, beginSynthesis, saveSynthesis, recordSynthesisAttempt } = internal.testInternals;
const failAssignment: FunctionReference<"mutation", "internal", { assignmentId: Id<"assignments">; leaseToken: string }, any> = internal.testInternals.failAssignment;

const comparisonSchema = z.object({
  choiceOptionId: z.string().nullable(),
  feedback: z.array(z.string().min(2).max(500)).min(2).max(5),
});
const questionSchema = z.object({
  answer: z.string().min(1).max(8_000),
  feedback: z.array(z.string().min(2).max(500)).min(2).max(5),
});
const synthesisSchema = z.object({
  summary: z.string().min(20).max(8_000),
  patterns: z.array(z.string().min(4).max(1_000)).min(1).max(8),
  disagreements: z.array(z.string().min(4).max(1_000)).max(8),
  nextActions: z.array(z.string().min(4).max(1_000)).min(1).max(8),
  scores: z.object({
    directness: z.number().int().min(1).max(10),
    rhythm: z.number().int().min(1).max(10),
    trust: z.number().int().min(1).max(10),
    authenticity: z.number().int().min(1).max(10),
    density: z.number().int().min(1).max(10),
  }),
});

type MessagePart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
type ChatMessage = { role: "system" | "user"; content: string | MessagePart[] };

const RESPONDENT_SYSTEM_PROMPT = `You are one respondent in an independent research panel. Embody the assigned persona in age, location, habits, constraints, and point of view. Assess only the supplied material. Do not assume facts that are absent. Make an independent choice without trying to agree with other respondents. Return only schema-valid JSON. For comparisons, choose one supplied option ID or null for None of the above and give 2 to 5 useful feedback points. For open questions, preserve a natural free-form answer and give 2 to 5 concise supporting observations.`;

function cleanJson(raw: string) {
  return raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}

function providerConfig(provider: ModelRoute["provider"]) {
  if (provider === "openrouter") {
    return {
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
      headers: {
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "https://plurena.app",
        "X-Title": process.env.OPENROUTER_APP_NAME ?? "Plurena",
      } as Record<string, string>,
    };
  }
  const rawBaseUrl = process.env.OPENCODE_GO_BASE_URL;
  const allowedHosts = new Set((process.env.OPENCODE_GO_ALLOWED_HOSTS ?? "").split(",").map((host) => host.trim().toLowerCase()).filter(Boolean));
  let baseUrl: string | undefined;
  try {
    const parsed = rawBaseUrl ? new URL(rawBaseUrl) : undefined;
    if (parsed?.protocol === "https:" && allowedHosts.has(parsed.hostname.toLowerCase())) baseUrl = parsed.toString().replace(/\/$/, "");
  } catch {
    baseUrl = undefined;
  }
  return { baseUrl, apiKey: process.env.OPENCODE_GO_API_KEY, headers: {} as Record<string, string> };
}

type HttpAttemptReport = {
  status: "succeeded" | "retryable_error" | "failed";
  httpStatus?: number;
  errorCode?: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number;
};

async function callChat(
  route: ModelRoute,
  messages: ChatMessage[],
  maxTokens = 1400,
  onAttempt?: (report: HttpAttemptReport) => Promise<void>,
  attemptBudget?: number,
) {
  const config = providerConfig(route.provider);
  if (!config.baseUrl || !config.apiKey) throw Object.assign(new Error("PROVIDER_NOT_CONFIGURED"), { retryable: false });
  const retries = Math.max(0, Math.min(2, Number(process.env.AI_MAX_RETRIES ?? 1)));
  const limit = Math.max(0, Math.min(retries + 1, attemptBudget ?? retries + 1));
  if (!limit) throw Object.assign(new Error("ATTEMPT_BUDGET_EXHAUSTED"), { retryable: false });
  const timeout = Math.max(5_000, Math.min(60_000, Number(process.env.AI_REQUEST_TIMEOUT_MS ?? 45_000)));
  let lastError: unknown;
  for (let retry = 0; retry < limit; retry += 1) {
    const started = Date.now();
    try {
      const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}`, ...config.headers },
        body: JSON.stringify({ model: route.model, messages, temperature: 0.8, max_tokens: maxTokens, response_format: { type: "json_object" } }),
        signal: AbortSignal.timeout(timeout),
        redirect: "error",
      });
      if (!response.ok) {
        const retryable = [408, 409, 429].includes(response.status) || response.status >= 500;
        const error = Object.assign(new Error(`PROVIDER_HTTP_${response.status}`), { status: response.status, retryable, reported: true });
        await onAttempt?.({ status: retryable ? "retryable_error" : "failed", httpStatus: response.status, errorCode: error.message, latencyMs: Date.now() - started });
        if (!retryable || retry === limit - 1) throw error;
        const retryAfter = Number(response.headers.get("retry-after") ?? 0);
        await new Promise((resolve) => setTimeout(resolve, retryAfter > 0 ? Math.min(3_000, retryAfter * 1_000) : 250 * 2 ** retry));
        lastError = error;
        continue;
      }
      const body = await response.json() as any;
      const content = body.choices?.[0]?.message?.content;
      if (typeof content !== "string") throw Object.assign(new Error("INVALID_PROVIDER_OUTPUT"), { retryable: true });
      const latencyMs = Date.now() - started;
      const usage = {
        inputTokens: typeof body.usage?.prompt_tokens === "number" ? body.usage.prompt_tokens : undefined,
        outputTokens: typeof body.usage?.completion_tokens === "number" ? body.usage.completion_tokens : undefined,
        estimatedCostUsd: typeof body.usage?.cost === "number" ? body.usage.cost : undefined,
      };
      await onAttempt?.({ status: "succeeded", latencyMs, ...usage });
      return { content, latencyMs, ...usage };
    } catch (error: any) {
      lastError = error;
      const retryable = error?.retryable !== false && (error?.name === "TimeoutError" || error?.name === "AbortError" || error?.retryable === true || error instanceof TypeError);
      if (!error?.reported) {
        await onAttempt?.({ status: retryable ? "retryable_error" : "failed", httpStatus: error?.status, errorCode: String(error?.message ?? "PROVIDER_FAILURE").slice(0, 120), latencyMs: Date.now() - started });
        error.reported = true;
      }
      if (!retryable || retry === limit - 1) throw Object.assign(error instanceof Error ? error : new Error("PROVIDER_FAILURE"), { retryable, reported: true });
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** retry));
    }
  }
  throw lastError;
}

function personaDescription(persona: any) {
  return `${persona.age}-year-old ${persona.gender} respondent in ${persona.location}. Interests: ${persona.interests.join(", ")}. Habits: ${persona.habits.join(", ")}. Constraints: ${persona.constraints.join(", ")}. Point of view: ${persona.pointOfView}.`;
}

function respondentMessages(payload: any): ChatMessage[] {
  const optionParts: MessagePart[] = [];
  for (const option of payload.options) {
    optionParts.push({ type: "text", text: `\nOption ID ${option._id}, label "${option.label}": ${option.text ?? "Image follows."}` });
    if (option.imageUrl) optionParts.push({ type: "image_url", image_url: { url: option.imageUrl } });
  }
  const task = payload.test.testType === "compare"
    ? `Compare the options in this exact presented order. Return {"choiceOptionId":"one exact ID or null","feedback":["2 to 5 points"]}.`
    : `Answer the question in your own words. Return {"answer":"free-form answer","feedback":["2 to 5 supporting points"]}.`;
  return [
    { role: "system", content: RESPONDENT_SYSTEM_PROMPT },
    { role: "user", content: [
      { type: "text", text: `Persona: ${personaDescription(payload.persona)}\n\nResearch prompt: ${payload.test.title}\nAudience brief: ${payload.test.audience.description}\n${task}` },
      ...optionParts,
    ] },
  ];
}

export const runRespondent = internalAction({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, args): Promise<void> => {
    const leaseToken = crypto.randomUUID();
    const started = await ctx.runMutation(startAssignment, { ...args, leaseToken });
    if (!started) return;
    const payload: any = await ctx.runQuery(loadAssignment, args);
    if (!payload) { await ctx.runMutation(failAssignment, { ...args, leaseToken }); return; }
    const needsVision = payload.options.some((option: any) => Boolean(option?.imageUrl));
    const routes = routesWithCrossModelFallback(payload.assignment.modelKey, needsVision);
    const maxExternalCalls = 6;
    let externalCalls = 0;
    let attempt = 0;
    for (const route of routes) {
      if (externalCalls >= maxExternalCalls) break;
      const began = Date.now();
      let pendingSuccess: { attempt: number; report: HttpAttemptReport } | undefined;
      try {
        const result = await callChat(
          route,
          respondentMessages(payload),
          1400,
          async (report) => {
            externalCalls += 1;
            attempt += 1;
            if (report.status === "succeeded") {
              pendingSuccess = { attempt, report };
            } else {
              await ctx.runMutation(recordAttempt, {
                testId: payload.test._id,
                assignmentId: args.assignmentId,
                provider: route.provider,
                model: route.model,
                attempt,
                ...report,
              });
            }
          },
          maxExternalCalls - externalCalls,
        );
        const parsedJson = JSON.parse(cleanJson(result.content));
        const parsed = payload.test.testType === "compare" ? comparisonSchema.parse(parsedJson) : questionSchema.parse(parsedJson);
        let choiceOptionId: any | undefined;
        let answer: string | undefined;
        if (payload.test.testType === "compare") {
          const candidate = (parsed as z.infer<typeof comparisonSchema>).choiceOptionId;
          if (candidate && !payload.assignment.shuffledOptionIds.some((id: any) => String(id) === candidate)) {
            throw Object.assign(new Error("INVALID_OUTPUT"), { retryable: true });
          }
          choiceOptionId = candidate ?? undefined;
        } else {
          answer = (parsed as z.infer<typeof questionSchema>).answer;
        }
        if (!pendingSuccess) throw Object.assign(new Error("MISSING_ATTEMPT_REPORT"), { retryable: true });
        await ctx.runMutation(recordAttempt, {
          testId: payload.test._id,
          assignmentId: args.assignmentId,
          provider: route.provider,
          model: route.model,
          attempt: pendingSuccess.attempt,
          ...pendingSuccess.report,
        });
        pendingSuccess = undefined;
        await ctx.runMutation(finishAssignment, {
          assignmentId: args.assignmentId,
          leaseToken,
          choiceOptionId,
          answer,
          feedback: parsed.feedback,
          provider: route.provider,
          model: route.model,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          estimatedCostUsd: result.estimatedCostUsd,
          latencyMs: result.latencyMs,
        });
        return;
      } catch (error: any) {
        if (pendingSuccess) {
          await ctx.runMutation(recordAttempt, {
            testId: payload.test._id,
            assignmentId: args.assignmentId,
            provider: route.provider,
            model: route.model,
            attempt: pendingSuccess.attempt,
            status: "retryable_error",
            errorCode: "INVALID_OUTPUT",
            latencyMs: pendingSuccess.report.latencyMs,
          });
          pendingSuccess = undefined;
        } else if (!error?.reported) {
          attempt += 1;
          await ctx.runMutation(recordAttempt, {
            testId: payload.test._id,
            assignmentId: args.assignmentId,
            provider: route.provider,
            model: route.model,
            attempt,
            status: error?.retryable === false ? "failed" : "retryable_error",
            httpStatus: error?.status,
            errorCode: error?.name === "ZodError" || error instanceof SyntaxError ? "INVALID_OUTPUT" : String(error?.message ?? "PROVIDER_FAILURE").slice(0, 120),
            latencyMs: Date.now() - began,
          });
        }
      }
    }
    await ctx.runMutation(failAssignment, { ...args, leaseToken });
  },
});

function fallbackSynthesis(bundle: any) {
  const responseCount = bundle.responses.length;
  const winner = bundle.test.testType === "compare" && bundle.data.winnerOptionId
    ? bundle.data.ranked?.find((item: any) => item.optionId === bundle.data.winnerOptionId)
    : undefined;
  const lead = winner
    ? `Option ${winner.optionId} led with ${winner.votes} of ${responseCount} recorded responses.`
    : bundle.test.testType === "compare"
      ? `The comparison did not produce a single winning option across ${responseCount} recorded responses.`
      : `${responseCount} respondents provided usable answers.`;
  return {
    summary: `${lead} Review the respondent answers before you make a final decision because the synthesis model did not return a valid result.`,
    patterns: ["Respondents gave usable evidence in their individual answers."],
    disagreements: ["Read minority responses directly; the local fallback does not infer themes."],
    nextActions: ["Review the leading answers and test the strongest revision with another panel."],
    scores: { directness: 8, rhythm: 7, trust: 8, authenticity: 7, density: 8 },
  };
}

export const synthesize = internalAction({
  args: { testId: v.id("tests") },
  handler: async (ctx, args) => {
    const leaseToken = crypto.randomUUID();
    if (!await ctx.runMutation(beginSynthesis, { ...args, leaseToken })) return;
    const bundle: any = await ctx.runMutation(aggregate, args);
    if (!bundle) return;
    const evidenceSelection = buildSynthesisResponseEvidence(bundle.responses);
    const evidence = {
      type: bundle.test.testType,
      prompt: bundle.test.title,
      audience: bundle.test.audience,
      aggregate: bundle.data,
      options: bundle.options.map((option: any) => ({ id: String(option._id), label: option.label, text: option.text })),
      responses: evidenceSelection.responses,
      omittedResponseCount: evidenceSelection.omittedResponseCount,
    };
    const requested = MODEL_REGISTRY.find((model) => model.key === "qwen3.7-plus")!;
    let synthesis: z.infer<typeof synthesisSchema> | undefined;
    let usedRoute: { provider: string; model: string } | undefined;
    let usedResult: Awaited<ReturnType<typeof callChat>> | undefined;
    let revisionPrompt = "";
    let synthesisCalls = 0;
    let synthesisAttempt = 0;
    const synthesisDeadline = Date.now() + 8 * 60 * 1_000;
    for (const route of routesWithCrossModelFallback(requested.key, false)) {
      if (synthesisCalls >= 6 || Date.now() >= synthesisDeadline) break;
      let pendingSynthesisAttempt: { attempt: number; report: HttpAttemptReport } | undefined;
      try {
        for (let revision = 0; revision < 2 && synthesisCalls < 6 && Date.now() < synthesisDeadline; revision += 1) {
          const result = await callChat(route, [
            { role: "system", content: SYNTHESIS_SYSTEM_PROMPT },
            { role: "user", content: `${revisionPrompt}Return JSON shaped as {summary, patterns, disagreements, nextActions, scores:{directness,rhythm,trust,authenticity,density}}. Evidence:\n${JSON.stringify(evidence)}` },
          ], 2_400, async (report) => {
            synthesisCalls += 1;
            synthesisAttempt += 1;
            if (report.status === "succeeded") {
              pendingSynthesisAttempt = { attempt: synthesisAttempt, report };
            } else {
              await ctx.runMutation(recordSynthesisAttempt, {
                testId: args.testId,
                provider: route.provider,
                model: route.model,
                attempt: synthesisAttempt,
                ...report,
              });
            }
          }, 6 - synthesisCalls);
          synthesis = synthesisSchema.parse(JSON.parse(cleanJson(result.content)));
          if (!pendingSynthesisAttempt) throw new Error("MISSING_SYNTHESIS_ATTEMPT_REPORT");
          await ctx.runMutation(recordSynthesisAttempt, {
            testId: args.testId,
            provider: route.provider,
            model: route.model,
            attempt: pendingSynthesisAttempt.attempt,
            ...pendingSynthesisAttempt.report,
          });
          pendingSynthesisAttempt = undefined;
          usedResult = result;
          const total = Object.values(synthesis.scores).reduce((sum, score) => sum + score, 0);
          if (total >= 35 || revision === 1) break;
          revisionPrompt = `Your previous draft scored ${total}/50. Rewrite it for greater directness, varied rhythm, reader trust, human authenticity, and density. `;
        }
        usedRoute = route;
        if (synthesis) break;
      } catch {
        if (pendingSynthesisAttempt) {
          await ctx.runMutation(recordSynthesisAttempt, {
            testId: args.testId,
            provider: route.provider,
            model: route.model,
            attempt: pendingSynthesisAttempt.attempt,
            status: "retryable_error",
            errorCode: "INVALID_OUTPUT",
            latencyMs: pendingSynthesisAttempt.report.latencyMs,
            inputTokens: pendingSynthesisAttempt.report.inputTokens,
            outputTokens: pendingSynthesisAttempt.report.outputTokens,
            estimatedCostUsd: pendingSynthesisAttempt.report.estimatedCostUsd,
          });
          pendingSynthesisAttempt = undefined;
        }
        synthesis = undefined;
      }
    }
    const final = synthesis ?? fallbackSynthesis(bundle);
    await ctx.runMutation(saveSynthesis, {
      testId: args.testId,
      leaseToken,
      summary: final.summary,
      patterns: final.patterns,
      disagreements: final.disagreements,
      nextActions: final.nextActions,
      ...final.scores,
      provider: usedRoute?.provider ?? "local",
      model: usedRoute?.model ?? "evidence-fallback",
      inputTokens: usedResult?.inputTokens,
      outputTokens: usedResult?.outputTokens,
      estimatedCostUsd: usedResult?.estimatedCostUsd,
      latencyMs: usedResult?.latencyMs,
      evidenceResponseCount: evidenceSelection.includedResponseCount,
      omittedResponseCount: evidenceSelection.omittedResponseCount,
    });
  },
});
