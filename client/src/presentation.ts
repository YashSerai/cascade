import type {
  AgentRole,
  AgentStatus,
  MissionBrief,
  MissionMode,
  MissionRun,
  MissionStage,
  SupportLevel
} from "../../shared/types";

export const modePresentation: Record<
  MissionMode,
  {
    label: string;
    description: string;
    promptLabel: string;
    shortLabel: string;
    kicker: string;
  }
> = {
  discover: {
    label: "Show Me Opportunities",
    description: "Turn messy customer signal into the next high-leverage improvement for the repo.",
    promptLabel: "Customer signal, notes, or friction you keep hearing",
    shortLabel: "Opportunities",
    kicker: "Opportunity lane"
  },
  mission: {
    label: "Ship a Specific Fix",
    description: "Point Cascade at one feature, bug, or upgrade and make the journey worth watching.",
    promptLabel: "The feature, bug, or product change you want shipped",
    shortLabel: "Specific fix",
    kicker: "Fix lane"
  }
};

export const agentOrder: AgentRole[] = ["pm", "architect", "executor", "qa"];

export const agentPresentation: Record<
  AgentRole,
  {
    name: string;
    nodeTitle: string;
    orbitClass: string;
    summary: string;
  }
> = {
  pm: {
    name: "Signal Reader",
    nodeTitle: "Turn the ask into one clear mission.",
    orbitClass: "agent-pm",
    summary: "Shapes the messy input into one product story the audience can follow."
  },
  architect: {
    name: "Route Planner",
    nodeTitle: "Choose the smartest path through the product.",
    orbitClass: "agent-architect",
    summary: "Finds where the experience should change and chooses the cleanest route."
  },
  executor: {
    name: "Builder",
    nodeTitle: "Make the visible change happen.",
    orbitClass: "agent-executor",
    summary: "Moves through the change surface and turns the route into a real product update."
  },
  qa: {
    name: "Proof Keeper",
    nodeTitle: "Make the reveal feel trustworthy.",
    orbitClass: "agent-qa",
    summary: "Checks the result, catches rough edges, and packages the handoff."
  }
};

export const stageSequence: Exclude<MissionStage, "mission_blocked">[] = [
  "objective_received",
  "recon",
  "plan_locked",
  "execution_underway",
  "verification",
  "proof_delivered"
];

export interface StagePresentation {
  chapter: string;
  title: string;
  description: string;
  pulse: string;
}

export const stagePresentation: Record<MissionStage, StagePresentation> = {
  objective_received: {
    chapter: "Find the Signal",
    title: "Cascade is turning the raw ask into one clear product mission.",
    description: "The messy notes are being translated into a user-facing promise the whole experience can rally around.",
    pulse: "The ask is becoming one clear mission."
  },
  recon: {
    chapter: "Read the Product",
    title: "Cascade is learning where the experience really lives.",
    description: "The app is being mapped so the eventual fix feels intentional instead of random.",
    pulse: "The product surface is coming into focus."
  },
  plan_locked: {
    chapter: "Choose the Route",
    title: "The best route is selected and the payoff is now explicit.",
    description: "Cascade has locked the direction, the change surface, and the bar for a believable reveal.",
    pulse: "The route is chosen and the payoff is locked."
  },
  execution_underway: {
    chapter: "Build the Change",
    title: "The visible product update is now being built.",
    description: "This is the making phase: the experience is being reshaped into something clearer, cleaner, and more confident.",
    pulse: "The visible change is now in motion."
  },
  verification: {
    chapter: "Check the Experience",
    title: "The result is being checked before the reveal lands.",
    description: "Cascade is making sure the story, the polish, and the proof line up before handing the mission back.",
    pulse: "The reveal is being checked before handoff."
  },
  proof_delivered: {
    chapter: "Reveal the Result",
    title: "The mission has landed and the handoff is ready.",
    description: "What changed, why it matters, and what happens next are now packaged into a clean finish.",
    pulse: "The mission is ready for the reveal."
  },
  mission_blocked: {
    chapter: "Handle the Blocker",
    title: "The mission hit friction, but the path forward is still clear.",
    description: "Cascade preserves context, surfaces the blocker, and leaves the next best move legible instead of cryptic.",
    pulse: "A blocker was captured without losing the story."
  }
};

export interface ChapterState {
  stage: Exclude<MissionStage, "mission_blocked">;
  chapter: string;
  pulse: string;
  state: "complete" | "active" | "pending" | "blocked";
}

export interface PreviewScene {
  title: string;
  body: string;
  state: ChapterState["state"];
}

export interface CrewSpotlight {
  role: AgentRole;
  name: string;
  statusLabel: string;
  statusTone: "complete" | "live" | "pending" | "blocked";
  nodeTitle: string;
  summary: string;
  detailTitle: string;
  detailBody: string;
  audienceTitle: string;
  audienceBody: string;
}

export function getMissionProgress(stage: MissionStage) {
  if (stage === "mission_blocked") {
    return 84;
  }

  const index = stageSequence.indexOf(stage);
  return Math.max(10, ((index + 1) / stageSequence.length) * 100);
}

export function getChapterStates(stage: MissionStage): ChapterState[] {
  const currentIndex =
    stage === "mission_blocked" ? stageSequence.indexOf("verification") : stageSequence.indexOf(stage);

  return stageSequence.map((entry, index) => {
    let state: ChapterState["state"] = "pending";
    if (stage === "mission_blocked" && index === currentIndex) {
      state = "blocked";
    } else if (index < currentIndex) {
      state = "complete";
    } else if (index === currentIndex) {
      state = "active";
    }

    return {
      stage: entry,
      chapter: stagePresentation[entry].chapter,
      pulse: stagePresentation[entry].pulse,
      state
    };
  });
}

export function getPreviewScenes(stage: MissionStage, brief: MissionBrief): PreviewScene[] {
  const currentIndex =
    stage === "mission_blocked" ? stageSequence.indexOf("verification") : stageSequence.indexOf(stage);

  return [
    {
      title: "Spot the friction",
      body: brief.painPoints[0] ?? "Cascade turns scattered signal into one clear mission.",
      state: currentIndex >= 1 ? "complete" : "active"
    },
    {
      title: "Choose the route",
      body: brief.implementationBrief,
      state: currentIndex >= 3 ? "complete" : currentIndex >= 2 ? "active" : "pending"
    },
    {
      title: "Land the reveal",
      body: brief.acceptanceCriteria[0] ?? "The update should feel obvious and trustworthy when it lands.",
      state: stage === "mission_blocked" ? "blocked" : currentIndex >= 4 ? "active" : "pending"
    }
  ];
}

export function getSupportPresentation(level: SupportLevel) {
  switch (level) {
    case "supported":
      return {
        label: "Ready for a live fix",
        body: "Cascade can analyze the repo, build the change, and land the reveal in the hosted demo."
      };
    case "advisory":
      return {
        label: "Strong planning preview",
        body: "Cascade can shape the route and the story even if execution may stay advisory."
      };
    case "unsupported":
      return {
        label: "Story-first preview",
        body: "Cascade can still frame the mission and the payoff, even if live patching is outside the supported lane."
      };
  }
}

export function getModelLabel(brief: MissionBrief) {
  return brief.modelSelection.activeModel ?? brief.modelSelection.requestedModel ?? "Heuristic mode";
}

export function getModelLane(brief: MissionBrief) {
  switch (brief.modelSelection.keyMode) {
    case "server":
      return "Hosted mission lane";
    case "user":
      return "Bring-your-own model lane";
    case "none":
      return "Planning-only lane";
  }
}

export function getCurrentChapterLabel(stage: MissionStage) {
  return stagePresentation[stage].chapter;
}

export function getDefaultCrewRole(mission: MissionRun): AgentRole {
  return (
    agentOrder
      .map((role) => mission.agents[role])
      .find((agent) => agent.status === "active" || agent.status === "blocked")?.role ?? "executor"
  );
}

export function getCrewSpotlight(role: AgentRole, brief: MissionBrief, mission: MissionRun): CrewSpotlight {
  const agent = mission.agents[role];
  const status = getStatusPresentation(agent.status);
  const firstOutcome = brief.acceptanceCriteria[0] ?? "The experience should feel cleaner and easier to trust.";
  const firstPain = brief.painPoints[0] ?? brief.rationale;
  const mainSurface = humanizeSurfaceLabel(brief.impactedAreas[0] ?? brief.repoScan.targetPathHint ?? "main experience");
  const proofCount = mission.artifacts.checks.length;

  switch (role) {
    case "pm":
      return {
        role,
        name: agentPresentation[role].name,
        statusLabel: status.label,
        statusTone: status.tone,
        nodeTitle: agentPresentation[role].nodeTitle,
        summary: agentPresentation[role].summary,
        detailTitle: "Why this mission is worth watching",
        detailBody: brief.rationale,
        audienceTitle: "What the audience should understand",
        audienceBody: firstPain
      };
    case "architect":
      return {
        role,
        name: agentPresentation[role].name,
        statusLabel: status.label,
        statusTone: status.tone,
        nodeTitle: agentPresentation[role].nodeTitle,
        summary: agentPresentation[role].summary,
        detailTitle: "Where the experience will change",
        detailBody: `Cascade is focusing on ${mainSurface} and the nearby surfaces that shape how the fix feels in the product.`,
        audienceTitle: "What this protects",
        audienceBody: "The change should feel deliberate, not like a patchwork of unrelated edits."
      };
    case "executor":
      return {
        role,
        name: agentPresentation[role].name,
        statusLabel: status.label,
        statusTone: status.tone,
        nodeTitle: agentPresentation[role].nodeTitle,
        summary: agentPresentation[role].summary,
        detailTitle: "What is being built right now",
        detailBody: brief.implementationBrief,
        audienceTitle: "What users should notice",
        audienceBody: firstOutcome
      };
    case "qa":
      return {
        role,
        name: agentPresentation[role].name,
        statusLabel: status.label,
        statusTone: status.tone,
        nodeTitle: agentPresentation[role].nodeTitle,
        summary: agentPresentation[role].summary,
        detailTitle: "How the reveal gets its confidence",
        detailBody:
          proofCount > 0
            ? `${proofCount} proof point${proofCount === 1 ? "" : "s"} already support the mission handoff.`
            : "Proof is being assembled so the outcome feels credible before it is handed back.",
        audienceTitle: "What this protects",
        audienceBody: "The final result should feel ready to trust, not like a mystery diff."
      };
  }
}

export function humanizeSurfaceLabel(value: string) {
  const normalized = value.replace(/\\/g, "/");
  if (/src\/app\.tsx/i.test(normalized)) {
    return "the main app experience";
  }
  if (/navigation/i.test(normalized)) {
    return "the navigation shell";
  }
  if (/style/i.test(normalized)) {
    return "the visual system";
  }
  if (/hero/i.test(normalized)) {
    return "the hero experience";
  }

  const leaf = normalized.split("/").filter(Boolean).at(-1) ?? normalized;
  return leaf
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function humanizeCheckName(value: string) {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function humanizeCheckStatus(status: "passed" | "failed" | "skipped") {
  switch (status) {
    case "passed":
      return "Verified";
    case "failed":
      return "Needs follow-up";
    case "skipped":
      return "Skipped";
  }
}

export function getVerificationCommand(brief: MissionBrief) {
  return brief.repoScan.buildCommand ?? brief.repoScan.testCommand ?? "Guided review only";
}

export function formatTimeLabel(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

function getStatusPresentation(status: AgentStatus) {
  switch (status) {
    case "done":
      return { label: "Finished", tone: "complete" as const };
    case "active":
      return { label: "In motion", tone: "live" as const };
    case "idle":
      return { label: "Up next", tone: "pending" as const };
    case "blocked":
      return { label: "Needs review", tone: "blocked" as const };
  }
}
