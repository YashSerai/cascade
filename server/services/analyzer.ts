import { z } from "zod";
import type { AnalyzeRequest, MissionBrief } from "../../shared/types";
import { parseGitHubTarget } from "./github";
import { buildFallbackBrief } from "./heuristics";
import { createEmptyModelSelection, generateStructuredJson, resolveApiKey } from "./model";
import { scanRepository } from "./repoScanner";

const coreBriefSchema = z.object({
  missionTitle: z.string(),
  selectedObjective: z.string(),
  rationale: z.string(),
  confidence: z.number().min(0).max(1),
  painPoints: z.array(z.string()).min(1),
  candidateFeatures: z.array(z.string()).min(3).max(5),
  acceptanceCriteria: z.array(z.string()).min(3).max(4),
  impactedAreas: z.array(z.string()).min(1).max(5),
  implementationBrief: z.string()
});

const routeSummaryCardZodSchema = z.object({
  label: z.string(),
  title: z.string(),
  body: z.string()
});

function routeRoleFocusZodSchema(role: "pm" | "architect" | "executor" | "qa") {
  return z.object({
    role: z.literal(role),
    headline: z.string(),
    currentLens: z.string(),
    repoHook: z.string(),
    successSignal: z.string(),
    filePaths: z.array(z.string()).min(1).max(3)
  });
}

const routePlanSchema = z.object({
  ribbonTitle: z.string(),
  ribbonSummary: z.string(),
  routeHeadline: z.string(),
  routeSummary: z.string(),
  whyThisRoute: z.string(),
  loadingSteps: z.array(
    z.object({
      label: z.string(),
      detail: z.string()
    })
  ).min(3).max(4),
  journeyMoments: z.array(z.string()).min(3).max(4),
  proofTargets: z.array(z.string()).min(2).max(4),
  fileMap: z.array(
    z.object({
      path: z.string(),
      reason: z.string(),
      phase: z.enum(["scan", "shape", "verify"])
    })
  ).min(2).max(6),
  summaryCards: z.object({
    lane: routeSummaryCardZodSchema,
    support: routeSummaryCardZodSchema,
    primarySurface: routeSummaryCardZodSchema,
    payoff: routeSummaryCardZodSchema
  }),
  roleFocus: z.object({
    pm: routeRoleFocusZodSchema("pm"),
    architect: routeRoleFocusZodSchema("architect"),
    executor: routeRoleFocusZodSchema("executor"),
    qa: routeRoleFocusZodSchema("qa")
  }),
  prTitle: z.string(),
  prSummary: z.string()
});

const coreBriefResponseSchema = {
  type: "object",
  properties: {
    missionTitle: { type: "string" },
    selectedObjective: { type: "string" },
    rationale: { type: "string" },
    confidence: { type: "number" },
    painPoints: { type: "array", items: { type: "string" } },
    candidateFeatures: { type: "array", items: { type: "string" } },
    acceptanceCriteria: { type: "array", items: { type: "string" } },
    impactedAreas: { type: "array", items: { type: "string" } },
    implementationBrief: { type: "string" }
  },
  required: [
    "missionTitle",
    "selectedObjective",
    "rationale",
    "confidence",
    "painPoints",
    "candidateFeatures",
    "acceptanceCriteria",
    "impactedAreas",
    "implementationBrief"
  ]
};

const routePlanResponseSchema = {
  type: "object",
  properties: {
    ribbonTitle: { type: "string" },
    ribbonSummary: { type: "string" },
    routeHeadline: { type: "string" },
    routeSummary: { type: "string" },
    whyThisRoute: { type: "string" },
    loadingSteps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          detail: { type: "string" }
        },
        required: ["label", "detail"]
      }
    },
    journeyMoments: { type: "array", items: { type: "string" } },
    proofTargets: { type: "array", items: { type: "string" } },
    fileMap: {
      type: "array",
      items: {
        type: "object",
        properties: {
          path: { type: "string" },
          reason: { type: "string" },
          phase: { type: "string", enum: ["scan", "shape", "verify"] }
        },
        required: ["path", "reason", "phase"]
      }
    },
    summaryCards: {
      type: "object",
      properties: {
        lane: routeSummaryCardSchema(),
        support: routeSummaryCardSchema(),
        primarySurface: routeSummaryCardSchema(),
        payoff: routeSummaryCardSchema()
      },
      required: ["lane", "support", "primarySurface", "payoff"]
    },
    roleFocus: {
      type: "object",
      properties: {
        pm: routeRoleFocusSchema("pm"),
        architect: routeRoleFocusSchema("architect"),
        executor: routeRoleFocusSchema("executor"),
        qa: routeRoleFocusSchema("qa")
      },
      required: ["pm", "architect", "executor", "qa"]
    },
    prTitle: { type: "string" },
    prSummary: { type: "string" }
  },
  required: [
    "ribbonTitle",
    "ribbonSummary",
    "routeHeadline",
    "routeSummary",
    "whyThisRoute",
    "loadingSteps",
    "journeyMoments",
    "proofTargets",
    "fileMap",
    "summaryCards",
    "roleFocus",
    "prTitle",
    "prSummary"
  ]
};

export async function analyzeMission(request: AnalyzeRequest): Promise<MissionBrief> {
  const repoTarget = parseGitHubTarget(request.repoUrl);
  const repoScan = await scanRepository(repoTarget);
  const { apiKey, keyMode, provider, clientOptions } = resolveApiKey(request.apiKey);
  const emptySelection = createEmptyModelSelection(keyMode, provider);
  const fallbackBrief = buildFallbackBrief({
    mode: request.mode,
    repoTarget,
    repoScan,
    promptText: request.promptText,
    keyMode,
    modelSelection: emptySelection
  });

  if (!apiKey) {
    return fallbackBrief;
  }

  try {
    const coreResult = await generateStructuredJson({
      apiKey,
      keyMode,
      provider,
      clientOptions,
      schema: coreBriefSchema,
      responseSchema: coreBriefResponseSchema,
      systemInstruction:
        "You are Cascade, a repo-aware product strategist. Turn GitHub repo context plus user intent into a short, user-facing mission brief. Avoid generic filler and keep every suggestion grounded in the repo scan.",
      prompt: buildCoreBriefPrompt({
        mode: request.mode,
        promptText: request.promptText,
        repoTarget,
        repoScan
      })
    });

    try {
      const routePlanResult = await generateStructuredJson({
        apiKey,
        keyMode,
        provider,
        clientOptions,
        schema: routePlanSchema,
        responseSchema: routePlanResponseSchema,
        systemInstruction:
          "You are Cascade, writing the user-facing route view for a repo-aware mission. The output must feel specific to the repo and request, not generic or internal.",
        prompt: buildRoutePlanPrompt({
          mode: request.mode,
          promptText: request.promptText,
          repoTarget,
          repoScan,
          coreBrief: coreResult.data
        })
      });

      return {
        ...coreResult.data,
        routePlan: routePlanResult.data,
        mode: request.mode,
        repoTarget,
        repoScan,
        modelSelection: routePlanResult.modelSelection
      };
    } catch (routeError) {
      console.warn(
        `[cascade analyze route fallback] provider=${provider} repo=${repoTarget.repoUrl} reason=${routeError instanceof Error ? routeError.message : "unknown"}`
      );

      return {
        ...fallbackBrief,
        ...coreResult.data,
        mode: request.mode,
        repoTarget,
        repoScan,
        routePlan: fallbackBrief.routePlan,
        modelSelection: coreResult.modelSelection
      };
    }
  } catch (coreError) {
    console.warn(
      `[cascade analyze fallback] provider=${provider} repo=${repoTarget.repoUrl} reason=${coreError instanceof Error ? coreError.message : "unknown"}`
    );
    return fallbackBrief;
  }
}

function buildCoreBriefPrompt(input: {
  mode: AnalyzeRequest["mode"];
  promptText: string;
  repoTarget: MissionBrief["repoTarget"];
  repoScan: MissionBrief["repoScan"];
}) {
  const modeLabel = input.mode === "discover" ? "Discover Mode" : "Mission Mode";
  return [
    `Mode: ${modeLabel}`,
    `Repo URL: ${input.repoTarget.repoUrl}`,
    `Framework: ${input.repoScan.framework}`,
    `Package manager: ${input.repoScan.packageManager}`,
    `Support level: ${input.repoScan.supportLevel}`,
    `Support reason: ${input.repoScan.supportReason}`,
    `Important files: ${input.repoScan.importantFiles.join(", ") || "none detected"}`,
    `Important file summaries: ${input.repoScan.importantFileSummaries.map((entry) => `${entry.path} => ${entry.summary}`).join(" | ") || "none detected"}`,
    `Known risks: ${input.repoScan.risks.join(" | ")}`,
    "",
    input.mode === "discover"
      ? "User-provided product signal:"
      : "User-provided implementation request:",
    input.promptText,
    "",
    "Return JSON only.",
    input.mode === "discover"
      ? "Choose one best route plus three or more real adjacent feature directions grounded in the same repo."
      : "Clarify the request into one main route plus three or more adjacent concrete improvements users might also want in the same area.",
    "candidateFeatures must be real user-facing alternatives, not generic filler like 'tighten the main surface' or 'add proof'.",
    "missionTitle should feel clean and concise. selectedObjective should be complete and not truncated. impactedAreas must match repo files or surfaces that the scan supports."
  ].join("\n");
}

function buildRoutePlanPrompt(input: {
  mode: AnalyzeRequest["mode"];
  promptText: string;
  repoTarget: MissionBrief["repoTarget"];
  repoScan: MissionBrief["repoScan"];
  coreBrief: z.infer<typeof coreBriefSchema>;
}) {
  return [
    `Mode: ${input.mode}`,
    `Repo URL: ${input.repoTarget.repoUrl}`,
    `Framework: ${input.repoScan.framework}`,
    `Support reason: ${input.repoScan.supportReason}`,
    `Important file summaries: ${input.repoScan.importantFileSummaries.map((entry) => `${entry.path} => ${entry.summary}`).join(" | ") || "none detected"}`,
    `Mission title: ${input.coreBrief.missionTitle}`,
    `Selected objective: ${input.coreBrief.selectedObjective}`,
    `Rationale: ${input.coreBrief.rationale}`,
    `Acceptance criteria: ${input.coreBrief.acceptanceCriteria.join(" | ")}`,
    `Impacted areas: ${input.coreBrief.impactedAreas.join(", ")}`,
    `Implementation brief: ${input.coreBrief.implementationBrief}`,
    `Alternate routes: ${input.coreBrief.candidateFeatures.join(" | ")}`,
    "",
    "Return JSON only.",
    "Write the route panel for a user watching the product work. Use clean product language, not internal agent jargon.",
    "summaryCards.lane/support/primarySurface/payoff must each feel specific to this repo and request.",
    "journeyMoments should describe what Cascade will do next in user-facing terms.",
    "proofTargets should describe what this run should prove to a judge or user.",
    "ribbonTitle must be concise and should not truncate the actual request awkwardly."
  ].join("\n");
}

function routeRoleFocusSchema(role: "pm" | "architect" | "executor" | "qa") {
  return {
    type: "object",
    properties: {
      role: { type: "string", enum: [role] },
      headline: { type: "string" },
      currentLens: { type: "string" },
      repoHook: { type: "string" },
      successSignal: { type: "string" },
      filePaths: { type: "array", items: { type: "string" } }
    },
    required: ["role", "headline", "currentLens", "repoHook", "successSignal", "filePaths"]
  } as const;
}

function routeSummaryCardSchema() {
  return {
    type: "object",
    properties: {
      label: { type: "string" },
      title: { type: "string" },
      body: { type: "string" }
    },
    required: ["label", "title", "body"]
  } as const;
}
