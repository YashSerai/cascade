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
  implementationBrief: z.string()
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

export async function analyzeMission(request: AnalyzeRequest): Promise<MissionBrief> {
  const repoTarget = parseGitHubTarget(request.repoUrl);
  const repoScan = await scanRepository(repoTarget);
  const { apiKey, keyMode } = resolveApiKey(request.apiKey);
  const emptySelection = createEmptyModelSelection(keyMode);

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
    "Avoid invented specifics such as database tables or files that are not grounded in the repo scan.",
    "Impacted areas can refer to file paths or subsystem names."
  ].join("\n");
}
