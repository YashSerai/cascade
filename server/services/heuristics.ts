import type { KeyMode, MissionBrief, MissionMode, ModelSelection, RepoScan, RepoTarget } from "../../shared/types";

export function buildFallbackBrief(input: {
  mode: MissionMode;
  repoTarget: RepoTarget;
  repoScan: RepoScan;
  promptText: string;
  keyMode: KeyMode;
  modelSelection: ModelSelection;
}): MissionBrief {
  const lines = input.promptText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const source = lines.length > 0 ? lines : [input.promptText.trim()];
  const featureSeed = source[0] ?? "Improve the primary user flow";
  const shortFeature = featureSeed.replace(/^[\-\*\d\.\)\s]+/, "").slice(0, 120);
  const candidateFeatures =
    input.mode === "discover"
      ? [toTitle(shortFeature), "Guided first run", "Restart and resume flow"]
      : [toTitle(shortFeature), "Tighten the main surface", "Add proof and verification"];

  const painPoints =
    input.mode === "discover"
      ? source.slice(0, 3).map((entry) => trimSentence(entry))
      : [
          "The requested change is still vague enough to need implementation framing.",
          "Verification needs to be grounded in the repo scripts."
        ];

  const selectedObjective =
    input.mode === "discover"
      ? candidateFeatures[0]
      : trimSentence(input.promptText) || "Implement the requested improvement";

  const acceptanceCriteria =
    input.mode === "discover"
      ? [
          "It solves the sharpest repeated signal.",
          "It stays grounded in the detected repo surface.",
          "It ends with at least one proof artifact."
        ]
      : [
          `Ship: ${trimSentence(input.promptText)}.`,
          "Match the detected framework and scripts.",
          "Return proof or a clear blocker."
        ];

  const impactedAreas =
    input.repoScan.importantFiles.length > 0
      ? input.repoScan.importantFiles.slice(0, 5)
      : ["package.json", "primary app shell", "global styles"];

  return {
    missionTitle:
      input.mode === "discover"
        ? candidateFeatures[0]
        : toTitle(trimSentence(input.promptText).slice(0, 70) || "Implement the requested change"),
    mode: input.mode,
    repoTarget: input.repoTarget,
    repoScan: input.repoScan,
    selectedObjective,
    rationale:
      input.mode === "discover"
        ? "Heuristic mode picked the clearest improvement from the provided signal because no accepted model output was available."
        : "Heuristic mode turned the request into a concrete repo-aware change because no accepted model output was available.",
    confidence: input.mode === "discover" ? 0.62 : 0.67,
    painPoints,
    candidateFeatures,
    acceptanceCriteria,
    impactedAreas,
    implementationBrief:
      input.repoScan.supportLevel === "supported"
        ? `Focus on ${impactedAreas.slice(0, 3).join(", ")}. Make the change visible, verify it, and package proof.`
        : "Keep this run advisory. Map the safest route and spell out what live execution would need.",
    modelSelection: input.modelSelection
  };
}

function toTitle(input: string) {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function trimSentence(input: string) {
  return input.replace(/\s+/g, " ").trim().replace(/[.]+$/, "");
}
