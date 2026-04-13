import { z } from "zod";
import type { AnalyzeRequest, MissionBrief } from "../../shared/types";
import { parseGitHubTarget } from "./github";
import { buildFallbackBrief } from "./heuristics";
import { createEmptyModelSelection, generateStructuredJson, resolveApiKey } from "./model";
import { scanRepository } from "./repoScanner";

const analysisSchema = z.object({
  missionTitle: z.string(),
  selectedObjective: z.string(),
  rationale: z.string(),
  confidence: z.number().min(0).max(1),
  painPoints: z.array(z.string()).min(1),
  candidateFeatures: z.array(z.string()).min(1),
  acceptanceCriteria: z.array(z.string()).min(1),
  impactedAreas: z.array(z.string()).min(1),
  implementationBrief: z.string(),
  routePlan: z.object({
    routeHeadline: z.string(),
    routeSummary: z.string(),
    whyThisRoute: z.string(),
    loadingSteps: z.array(
      z.object({
        label: z.string(),
        detail: z.string()
      })
    ).min(3).max(4),
    journeyMoments: z.array(z.string()).min(3).max(5),
    proofTargets: z.array(z.string()).min(2).max(4),
    fileMap: z.array(
      z.object({
        path: z.string(),
        reason: z.string(),
        phase: z.enum(["scan", "shape", "verify"])
      })
    ).min(2).max(6),
    roleFocus: z.object({
      pm: z.object({
        role: z.literal("pm"),
        headline: z.string(),
        currentLens: z.string(),
        repoHook: z.string(),
        successSignal: z.string(),
        filePaths: z.array(z.string()).min(1).max(3)
      }),
      architect: z.object({
        role: z.literal("architect"),
        headline: z.string(),
        currentLens: z.string(),
        repoHook: z.string(),
        successSignal: z.string(),
        filePaths: z.array(z.string()).min(1).max(3)
      }),
      executor: z.object({
        role: z.literal("executor"),
        headline: z.string(),
        currentLens: z.string(),
        repoHook: z.string(),
        successSignal: z.string(),
        filePaths: z.array(z.string()).min(1).max(3)
      }),
      qa: z.object({
        role: z.literal("qa"),
        headline: z.string(),
        currentLens: z.string(),
        repoHook: z.string(),
        successSignal: z.string(),
        filePaths: z.array(z.string()).min(1).max(3)
      })
    }),
    prTitle: z.string(),
    prSummary: z.string()
  })
});

const analysisResponseSchema = {
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
    implementationBrief: { type: "string" },
    routePlan: {
      type: "object",
      properties: {
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
        "routeHeadline",
        "routeSummary",
        "whyThisRoute",
        "loadingSteps",
        "journeyMoments",
        "proofTargets",
        "fileMap",
        "roleFocus",
        "prTitle",
        "prSummary"
      ]
    }
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
    "implementationBrief",
    "routePlan"
  ]
};

export async function analyzeMission(request: AnalyzeRequest): Promise<MissionBrief> {
  const repoTarget = parseGitHubTarget(request.repoUrl);
  const repoScan = await scanRepository(repoTarget);
  const { apiKey, keyMode, provider, clientOptions } = resolveApiKey(request.apiKey);
  const emptySelection = createEmptyModelSelection(keyMode, provider);

  if (!apiKey) {
    return buildFallbackBrief({
      mode: request.mode,
      repoTarget,
      repoScan,
      promptText: request.promptText,
      keyMode,
      modelSelection: emptySelection
    });
  }

  const prompt = buildAnalysisPrompt({
    mode: request.mode,
    promptText: request.promptText,
    repoTarget,
    repoScan
  });

  try {
    const result = await generateStructuredJson({
      apiKey,
      keyMode,
      provider,
      clientOptions,
      schema: analysisSchema,
      responseSchema: analysisResponseSchema,
      systemInstruction:
        "You are Cascade, a repo-aware product strategist. Turn GitHub repo context plus user intent into a realistic mission brief. Only claim what is supported by the repo scan and input.",
      prompt
    });

    return {
      ...result.data,
      mode: request.mode,
      repoTarget,
      repoScan,
      modelSelection: result.modelSelection
    };
  } catch {
    return buildFallbackBrief({
      mode: request.mode,
      repoTarget,
      repoScan,
      promptText: request.promptText,
      keyMode,
      modelSelection: emptySelection
    });
  }
}

function buildAnalysisPrompt(input: {
  mode: AnalyzeRequest["mode"];
  promptText: string;
  repoTarget: MissionBrief["repoTarget"];
  repoScan: MissionBrief["repoScan"];
}) {
  const modeLabel = input.mode === "discover" ? "Discover Mode" : "Mission Mode";
  return [
    `Mode: ${modeLabel}`,
    `Repo URL: ${input.repoTarget.repoUrl}`,
    `Target path: ${input.repoTarget.targetPath ?? "none"}`,
    `Framework: ${input.repoScan.framework}`,
    `Package manager: ${input.repoScan.packageManager}`,
    `Support level: ${input.repoScan.supportLevel}`,
    `Support reason: ${input.repoScan.supportReason}`,
    `Important files: ${input.repoScan.importantFiles.join(", ") || "none detected"}`,
    `Important file summaries: ${input.repoScan.importantFileSummaries.map((entry) => `${entry.path} => ${entry.summary}`).join(" | ") || "none detected"}`,
    `Known risks: ${input.repoScan.risks.join(" | ")}`,
    "",
    input.mode === "discover"
      ? "User-provided signal such as customer feedback, meeting notes, or issues:"
      : "User-provided implementation request:",
    input.promptText,
    "",
    "Return JSON only.",
    input.mode === "discover"
      ? "In Discover Mode, extract pain points, rank likely features, choose one mission, explain why, and keep acceptance criteria concrete."
      : "In Mission Mode, clarify the direct request into a mission title, objective, acceptance criteria, impacted areas, and an implementation brief.",
    "Keep the copy tight and demo-ready. missionTitle: 8 words max with no brand prefix. selectedObjective: 10 words max. rationale: 2 short sentences max. Each pain point and acceptance criterion: 12 words max. implementationBrief: 18 words max.",
    "Route plan requirements: loadingSteps should describe what analyze appears to be doing while it clones/reads/plans. journeyMoments should feel like a cinematic but repo-grounded mission arc. roleFocus must be specific to repo files or surfaces. fileMap should mention the files that matter most to this ask. prTitle should read like a clean pull request title.",
    "Avoid invented specifics such as database tables or files that are not grounded in the repo scan.",
    "Impacted areas can refer to file paths or subsystem names."
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
