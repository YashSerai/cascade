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
      ? [toTitle(shortFeature), `Improve ${input.repoScan.framework} onboarding`, "Clarify the first-run experience"]
      : [toTitle(shortFeature), "Tighten the implementation surface", "Add verification and proof"];

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
          "The chosen feature clearly addresses the repeated customer signal.",
          "The impacted files stay within the supported web surface when possible.",
          "Proof includes changed files and at least one verification artifact."
        ]
      : [
          `Implement the request: ${trimSentence(input.promptText)}.`,
          "Keep the implementation aligned with the detected framework and scripts.",
          "Return an honest proof bundle with blockers if the repo falls outside the supported lane."
        ];

  const impactedAreas =
    input.repoScan.importantFiles.length > 0
      ? input.repoScan.importantFiles.slice(0, 5)
      : ["package.json", "primary app shell", "global styles"];

  return {
    missionTitle:
      input.mode === "discover"
        ? `Cascade mission: ${candidateFeatures[0]}`
        : `Cascade mission: ${toTitle(trimSentence(input.promptText).slice(0, 70) || "Implement the requested change")}`,
    mode: input.mode,
    repoTarget: input.repoTarget,
    repoScan: input.repoScan,
    selectedObjective,
    rationale:
      input.mode === "discover"
        ? "Cascade used a heuristic fallback because a Gemini key was unavailable or the model response was rejected. The chosen feature best matched the strongest repeated signal in the provided notes."
        : "Cascade used a heuristic fallback to convert the direct request into a concrete implementation target while preserving repo-aware constraints.",
    confidence: input.mode === "discover" ? 0.62 : 0.67,
    painPoints,
    candidateFeatures,
    acceptanceCriteria,
    impactedAreas,
    implementationBrief:
      input.repoScan.supportLevel === "supported"
        ? `Focus the mission on ${impactedAreas.join(", ")}. Plan a visible change, verify with the detected scripts, and package proof for handoff.`
        : `Keep this mission in advisory mode. Analyze the repo, propose the safest execution path, and explain what would be required for a real run.`,
    modelSelection: input.modelSelection
  };
}

function toTitle(input: string) {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function trimSentence(input: string) {
  return input.replace(/\s+/g, " ").trim().replace(/[.]+$/, "");
}
