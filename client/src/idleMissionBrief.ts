import type { AgentRole, MissionBrief, MissionMode, RouteRoleFocus } from "../../shared/types";

const emptyRoleFocus = (paths: string[]): RouteRoleFocus => ({
  role: "pm",
  headline: "Waiting for analyze",
  currentLens: "Run Analyze route to scan the repo.",
  repoHook: "No scan yet.",
  successSignal: "Mission preview unlocks after analysis.",
  filePaths: paths.length ? paths : ["—"]
});

function roleFocusShell(filePaths: string[]): Record<AgentRole, RouteRoleFocus> {
  return {
    pm: { ...emptyRoleFocus(filePaths), role: "pm" },
    architect: { ...emptyRoleFocus(filePaths), role: "architect" },
    executor: { ...emptyRoleFocus(filePaths), role: "executor" },
    qa: { ...emptyRoleFocus(filePaths), role: "qa" }
  };
}

function parseGithubTarget(input: string): MissionBrief["repoTarget"] {
  const trimmed = input.trim();
  const fallback: MissionBrief["repoTarget"] = {
    inputUrl: trimmed || "https://github.com/",
    repoUrl: "https://github.com/",
    owner: "",
    repo: "",
    cloneUrl: "https://github.com/.git"
  };
  if (!trimmed) {
    return fallback;
  }
  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const segments = url.pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
    const owner = segments[0] ?? "";
    const repo = (segments[1] ?? "").replace(/\.git$/i, "");
    if (!owner || !repo) {
      return { ...fallback, inputUrl: trimmed };
    }
    const repoUrl = `https://github.com/${owner}/${repo}`;
    return {
      inputUrl: trimmed,
      repoUrl,
      owner,
      repo,
      cloneUrl: `${repoUrl}.git`
    };
  } catch {
    return { ...fallback, inputUrl: trimmed };
  }
}

/**
 * Minimal brief so MissionRun / drawer stay type-safe before the first Analyze.
 * Not shown in Mission Preview (Prelude uses null until a real brief exists).
 */
export function createIdleMissionBrief(repoUrl: string, mode: MissionMode): MissionBrief {
  const repoTarget = parseGithubTarget(repoUrl);
  const repoLabel = repoTarget.repo ? `${repoTarget.owner}/${repoTarget.repo}` : "your repo";

  return {
    missionTitle: "",
    mode,
    repoTarget,
    repoScan: {
      framework: "—",
      packageManager: "—",
      supportLevel: "unsupported",
      supportReason: "Repository has not been scanned yet. Run Analyze route.",
      importantFiles: [],
      importantFileSummaries: [],
      risks: [],
      rootScripts: []
    },
    selectedObjective: "",
    rationale: "",
    confidence: 0,
    painPoints: [],
    candidateFeatures: [],
    acceptanceCriteria: [],
    impactedAreas: [],
    implementationBrief: "",
    routePlan: {
      ribbonTitle: "",
      ribbonSummary: "",
      routeHeadline: "",
      routeSummary: "",
      whyThisRoute: "",
      loadingSteps: [
        { label: "Clone repo", detail: "Runs when you click Analyze route." },
        { label: "Read surfaces", detail: "Cascade maps real files after the scan." },
        { label: "Lock route", detail: "Personalized route cards appear here." }
      ],
      journeyMoments: ["Analyze route to generate repo-aware copy."],
      proofTargets: ["Run analyze to see proof targets for this repo."],
      fileMap: [],
      summaryCards: {
        lane: { label: "Lane", title: "—", body: "Waiting for analyze." },
        support: { label: "Support", title: "—", body: "Scan runs on Analyze route." },
        primarySurface: { label: "Surface", title: "—", body: `Targets ${repoLabel}.` },
        payoff: { label: "Payoff", title: "—", body: "Your ask shapes the mission after analyze." }
      },
      roleFocus: roleFocusShell([]),
      prTitle: "",
      prSummary: ""
    },
    modelSelection: {
      requestedModel: "",
      fallbackModel: "",
      attemptedModels: [],
      fallbackUsed: false,
      keyMode: "none",
      provider: "none"
    }
  };
}
