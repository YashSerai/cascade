import type { KeyMode, MissionBrief, MissionMode, ModelSelection, RepoScan, RepoTarget, RoutePlan } from "../../shared/types";

export function buildFallbackBrief(input: {
  mode: MissionMode;
  repoTarget: RepoTarget;
  repoScan: RepoScan;
  promptText: string;
  keyMode: KeyMode;
  modelSelection: ModelSelection;
}): MissionBrief {
  const sourceLines = input.promptText
    .split(/\r?\n/)
    .map((line) => cleanSentence(line))
    .filter(Boolean);
  const requestLine = sourceLines[0] ?? "Improve the primary product flow";
  const impactedAreas =
    input.repoScan.importantFiles.length > 0 ? input.repoScan.importantFiles.slice(0, 5) : ["src/App.tsx", "global styles"];
  const adjacentRoutes = suggestAdjacentRoutes(requestLine, input.mode, input.repoScan, impactedAreas);
  const selectedObjective = summarizeObjective(requestLine, input.mode);
  const acceptanceCriteria =
    input.mode === "discover"
      ? [
          "The change solves a repeated user-facing pain point.",
          "The route stays grounded in the repo surface and scripts.",
          "The output is easy to verify in a demo."
        ]
      : [
          `Ship ${toSentenceCase(selectedObjective)} with a visible UI or product shift.`,
          "Keep the route grounded in the detected files and scripts.",
          "End with proof or a clear blocker."
        ];

  const routePlan = buildFallbackRoutePlan({
    mode: input.mode,
    repoTarget: input.repoTarget,
    repoScan: input.repoScan,
    requestLine,
    selectedObjective,
    impactedAreas,
    adjacentRoutes,
    acceptanceCriteria
  });

  return {
    missionTitle: routePlan.ribbonTitle,
    mode: input.mode,
    repoTarget: input.repoTarget,
    repoScan: input.repoScan,
    selectedObjective,
    rationale:
      input.mode === "discover"
        ? `Cascade used a repo-aware fallback route because the hosted model did not return accepted structured output in time.`
        : `Cascade used a repo-aware fallback route because the hosted model did not return accepted structured output in time.`,
    confidence: input.mode === "discover" ? 0.66 : 0.7,
    painPoints: buildPainPoints(requestLine, input.mode, input.repoScan),
    candidateFeatures: adjacentRoutes,
    acceptanceCriteria,
    impactedAreas,
    implementationBrief: routePlan.payoffSummary,
    routePlan,
    modelSelection: input.modelSelection
  };
}

function buildFallbackRoutePlan(input: {
  mode: MissionMode;
  repoTarget: RepoTarget;
  repoScan: RepoScan;
  requestLine: string;
  selectedObjective: string;
  impactedAreas: string[];
  adjacentRoutes: string[];
  acceptanceCriteria: string[];
}): RoutePlan & { payoffSummary: string } {
  const primarySurface = input.impactedAreas[0] ?? "the main app experience";
  const primarySummary = input.repoScan.importantFileSummaries.find((entry) => entry.path === primarySurface)?.summary;
  const routeHeadline =
    input.mode === "discover"
      ? `Find the clearest product win in ${humanizePath(primarySurface)}.`
      : `Build ${toSentenceCase(input.selectedObjective)} in the clearest product surface.`;
  const ribbonTitle =
    input.mode === "discover" ? summarizeTitle(input.selectedObjective, 9) : summarizeTitle(input.requestLine, 10);
  const ribbonSummary =
    input.mode === "discover"
      ? `Cascade will inspect ${input.repoTarget.repo}, compare the strongest product opportunities, and lock the most demoable route.`
      : `Cascade will inspect ${input.repoTarget.repo}, read ${input.impactedAreas.slice(0, 3).join(", ")}, and shape a clean path to ${toSentenceCase(input.selectedObjective).toLowerCase()}.`;
  const payoffSummary =
    input.mode === "discover"
      ? `Turn repeated product friction into one visible improvement users can notice quickly.`
      : `Ship ${toSentenceCase(input.selectedObjective).toLowerCase()} with proof anchored to ${humanizePath(primarySurface)}.`;

  return {
    ribbonTitle,
    ribbonSummary,
    routeHeadline,
    routeSummary: `The route stays anchored to ${humanizePath(primarySurface)} and the nearby files that shape the visible product outcome.`,
    whyThisRoute: primarySummary
      ? `${humanizePath(primarySurface)} is the best route because ${primarySummary}`
      : `${humanizePath(primarySurface)} is the cleanest place to make the change feel obvious.`,
    loadingSteps: [
      {
        label: "Clone the repo",
        detail: `Pull ${input.repoTarget.repo} into a temporary workspace and inspect the real file structure.`
      },
      {
        label: "Read the product surface",
        detail: `Look through ${input.impactedAreas.slice(0, 3).join(", ")} to find the smallest believable route.`
      },
      {
        label: "Lock the route",
        detail: `Turn the repo scan into user-facing route cards, proof targets, and an execution-ready handoff.`
      }
    ],
    journeyMoments: [
      `Read ${humanizePath(primarySurface)} and the surrounding files before choosing the route.`,
      `Keep the route tight enough to demo clearly and broad enough to feel meaningful.`,
      `Carry proof targets forward so the final run can be explained without reading a diff.`
    ],
    proofTargets: [
      `Show the updated ${humanizePath(primarySurface)} state.`,
      "Show the strongest verification result or explicit blocker.",
      "Summarize the change as a PR-ready handoff."
    ],
    fileMap: input.impactedAreas.slice(0, 4).map((path, index) => ({
      path,
      reason:
        index === 0
          ? "Primary route surface for the visible outcome."
          : index === 1
            ? "Supports the same user-facing flow."
            : "Useful for validation, polish, or route context.",
      phase: index === 0 ? "shape" : index === 1 ? "scan" : "verify"
    })),
    summaryCards: {
      lane: {
        label: "Lane",
        title: input.mode === "discover" ? "Discovery route" : "Fix route",
        body:
          input.mode === "discover"
            ? "Compare concrete product moves and pick the most demo-worthy one."
            : "Turn the request into one clean implementation path without diff-hunting."
      },
      support: {
        label: "Support",
        title:
          input.repoScan.supportLevel === "supported"
            ? "Ready for a live pass"
            : input.repoScan.supportLevel === "advisory"
              ? "Strong planning fit"
              : "Planning only",
        body: input.repoScan.supportReason
      },
      primarySurface: {
        label: "Primary surface",
        title: humanizePath(primarySurface),
        body: primarySummary ?? "This is the clearest place to make the outcome visible."
      },
      payoff: {
        label: "Payoff",
        title: acceptanceTitle(input.acceptanceCriteria[0] ?? "Make the change feel obvious."),
        body: payoffSummary
      }
    },
    roleFocus: {
      pm: {
        role: "pm",
        headline: "Frame the route around the clearest visible win.",
        currentLens: `The mission should land as one concrete move, not a generic rewrite of the prompt.`,
        repoHook: `The route is centered on ${humanizePath(primarySurface)} because that is where the outcome will read first.`,
        successSignal: input.acceptanceCriteria[0] ?? "The payoff should be obvious immediately.",
        filePaths: input.impactedAreas.slice(0, 2)
      },
      architect: {
        role: "architect",
        headline: "Keep the route inside the smallest believable file set.",
        currentLens: `The route should stay coherent across ${input.impactedAreas.slice(0, 3).join(", ")}.`,
        repoHook: input.repoScan.supportReason,
        successSignal: input.acceptanceCriteria[1] ?? "The route should match repo constraints.",
        filePaths: input.impactedAreas.slice(0, 3)
      },
      executor: {
        role: "executor",
        headline: "Build the change where users will notice it first.",
        currentLens: `Implementation should read as a visible update in ${humanizePath(primarySurface)}.`,
        repoHook: primarySummary ?? "The repo exposes a product-facing entry point for the change.",
        successSignal: input.acceptanceCriteria[0] ?? "The update feels shipped, not sketched.",
        filePaths: input.impactedAreas.slice(0, 2)
      },
      qa: {
        role: "qa",
        headline: "Package proof that a judge can follow quickly.",
        currentLens: input.repoScan.buildCommand ?? input.repoScan.testCommand ?? "Guided review only",
        repoHook: "Proof should connect changed files, verification, and the visible product shift.",
        successSignal: input.acceptanceCriteria[2] ?? "Proof or blocker should be explicit.",
        filePaths: input.impactedAreas.slice(0, 2)
      }
    },
    prTitle: input.mode === "discover" ? summarizeTitle(input.selectedObjective, 10) : summarizeTitle(input.requestLine, 12),
    prSummary: payoffSummary,
    payoffSummary
  };
}

function buildPainPoints(requestLine: string, mode: MissionMode, repoScan: RepoScan) {
  if (mode === "discover") {
    return [
      cleanSentence(requestLine),
      `The change needs to stay inside ${repoScan.framework} and ${repoScan.packageManager}.`,
      "The result should be easy to explain in a short demo."
    ];
  }

  return [
    `The ask needs a route that is specific to ${repoScan.importantFiles[0] ?? "the app shell"}.`,
    "The result should avoid generic implementation framing."
  ];
}

function suggestAdjacentRoutes(requestLine: string, mode: MissionMode, repoScan: RepoScan, impactedAreas: string[]) {
  const normalized = requestLine.toLowerCase();

  if (/pricing|tier|billing|plan/.test(normalized)) {
    return mode === "discover"
      ? [
          "Add a pricing comparison matrix",
          "Add annual billing savings and a toggle",
          "Add enterprise FAQ and contact CTA"
        ]
      : [
          "Add annual billing toggle with savings",
          "Add enterprise plan FAQ under pricing",
          "Add feature callouts for each plan tier"
        ];
  }

  if (/onboarding|signup|first run|first-run|get started/.test(normalized)) {
    return mode === "discover"
      ? ["Guided onboarding checklist", "Resume onboarding from last step", "Progress-based first-run hero"]
      : ["Add a step-by-step onboarding rail", "Add resume onboarding from last step", "Add first-run checklist with completion states"];
  }

  if (/nav|navigation|menu|header/.test(normalized)) {
    return mode === "discover"
      ? ["Simplify the main navigation", "Add sticky section wayfinding", "Improve mobile menu clarity"]
      : ["Add sticky section navigation", "Improve mobile menu grouping", "Add anchor wayfinding for long pages"];
  }

  if (/dashboard|analytics|metric|chart/.test(normalized)) {
    return mode === "discover"
      ? ["Promote the most important KPI", "Add trend comparison cards", "Improve empty-state guidance"]
      : ["Add trend comparison summary", "Highlight the primary KPI first", "Add empty-state help for missing data"];
  }

  const primarySurface = humanizePath(impactedAreas[0] ?? repoScan.importantFiles[0] ?? "main app surface");
  return mode === "discover"
    ? [
        `Clarify ${primarySurface}`,
        `Add a stronger call to action in ${primarySurface}`,
        `Improve proof and verification around ${primarySurface}`
      ]
    : [
        `Tighten ${primarySurface}`,
        `Add a companion section near ${primarySurface}`,
        `Improve the proof flow around ${primarySurface}`
      ];
}

function summarizeObjective(requestLine: string, mode: MissionMode) {
  if (mode === "discover") {
    return summarizeTitle(requestLine, 8);
  }
  return summarizeTitle(requestLine, 12);
}

function summarizeTitle(input: string, maxWords: number) {
  return cleanSentence(input)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxWords)
    .map((word, index) => (index === 0 ? capitalize(word) : lowercaseWord(word)))
    .join(" ");
}

function acceptanceTitle(value: string) {
  return cleanSentence(value).replace(/^Ship\s+/i, "");
}

function cleanSentence(input: string) {
  return input.replace(/^[\-\*\d\.\)\s]+/, "").replace(/\s+/g, " ").trim().replace(/[.]+$/, "");
}

function humanizePath(value: string) {
  return value
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .at(-1)
    ?.replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase()) ?? value;
}

function toSentenceCase(input: string) {
  const cleaned = cleanSentence(input);
  if (!cleaned) {
    return cleaned;
  }
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function lowercaseWord(value: string) {
  return /^(ui|ux|cta|faq|kpi|api|pr)$/i.test(value) ? value.toUpperCase() : value.toLowerCase();
}
