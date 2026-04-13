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
    routePlan: {
      routeHeadline: input.repoScan.supportLevel === "supported" ? "Clone, map, and lock the highest-leverage surface." : "Map the route before execution leaves the advisory lane.",
      routeSummary: `Cascade will clone ${input.repoTarget.repo}, read ${impactedAreas.slice(0, 3).join(", ")}, and shape a proof-friendly path for ${selectedObjective}.`,
      whyThisRoute: `The route centers on ${impactedAreas[0] ?? "the main app shell"} because it is the clearest place to make the change legible.`,
      loadingSteps: [
        {
          label: "Clone repo",
          detail: `Pull the latest public state of ${input.repoTarget.repo}.`
        },
        {
          label: "Read surfaces",
          detail: `Inspect ${impactedAreas.slice(0, 3).join(", ")} for the cleanest visible change path.`
        },
        {
          label: "Lock pseudo-plan",
          detail: "Turn the ask into route cards, role focus, and proof targets before execution starts."
        }
      ],
      journeyMoments: [
        `Open ${impactedAreas[0] ?? "the main surface"} and confirm where the change will read first.`,
        "Translate the ask into one ship-ready route instead of a generic restatement.",
        "Carry proof targets forward so the result is easy to demo after the patch lands."
      ],
      proofTargets: [
        `Capture the updated ${toTitle(impactedAreas[0] ?? "main surface")} state.`,
        "Show the verification result or explicit blocker output.",
        "Summarize the patch as a PR-ready handoff."
      ],
      fileMap: impactedAreas.slice(0, 4).map((path, index) => ({
        path,
        reason: index === 0 ? "Likely primary change surface." : index === 1 ? "Supports the visible experience." : "Needed for route context or verification.",
        phase: index === 0 ? "shape" as const : index === 1 ? "scan" as const : "verify" as const
      })),
      roleFocus: {
        pm: {
          role: "pm",
          headline: "Compress the ask into one demo-worthy move.",
          currentLens: selectedObjective,
          repoHook: `Bias toward ${impactedAreas[0] ?? "the main surface"} as the visible win.`,
          successSignal: acceptanceCriteria[0] ?? "The change reads immediately.",
          filePaths: impactedAreas.slice(0, 2)
        },
        architect: {
          role: "architect",
          headline: "Lock the route across the tightest set of files.",
          currentLens: input.repoScan.supportReason,
          repoHook: `Route should stay inside ${impactedAreas.slice(0, 3).join(", ")}.`,
          successSignal: acceptanceCriteria[1] ?? "The route matches the repo constraints.",
          filePaths: impactedAreas.slice(0, 3)
        },
        executor: {
          role: "executor",
          headline: "Apply the change where users will actually notice it.",
          currentLens: `Implementation threads through ${impactedAreas[0] ?? "the main app shell"}.`,
          repoHook: input.repoScan.importantFileSummaries[0]?.summary ?? "Visible UI code is available for patching.",
          successSignal: acceptanceCriteria[0] ?? "The change is visibly shipped.",
          filePaths: impactedAreas.slice(0, 2)
        },
        qa: {
          role: "qa",
          headline: "Package proof without losing the repo context.",
          currentLens: input.repoScan.buildCommand ?? input.repoScan.testCommand ?? "No verification command detected.",
          repoHook: "Proof should include changed files, checks, and a PR-ready summary.",
          successSignal: acceptanceCriteria[2] ?? "Proof or blocker is explicit.",
          filePaths: impactedAreas.slice(0, 2)
        }
      },
      prTitle: selectedObjective,
      prSummary: `Ship ${selectedObjective.toLowerCase()} with proof anchored to ${impactedAreas[0] ?? "the main app experience"}.`
    },
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
