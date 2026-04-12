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
    label: "Find the Next Fix",
    description: "Condense messy signal into one high-leverage move.",
    promptLabel: "Signal, notes, or repeated friction",
    shortLabel: "Discovery",
    kicker: "Discovery lane"
  },
  mission: {
    label: "Ship a Known Fix",
    description: "Frame one feature or bug and run it live.",
    promptLabel: "Feature, bug, or product change",
    shortLabel: "Live fix",
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
    nodeTitle: "Turn the ask into a mission.",
    orbitClass: "agent-pm",
    summary: "Compresses messy signal into one outcome worth showing."
  },
  architect: {
    name: "Route Planner",
    nodeTitle: "Pick the cleanest route.",
    orbitClass: "agent-architect",
    summary: "Finds the product surface that can carry the change cleanly."
  },
  executor: {
    name: "Builder",
    nodeTitle: "Build the visible shift.",
    orbitClass: "agent-executor",
    summary: "Turns the route into a concrete product update."
  },
  qa: {
    name: "Proof Keeper",
    nodeTitle: "Make the handoff believable.",
    orbitClass: "agent-qa",
    summary: "Checks the result and packages proof for handoff."
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
    chapter: "Find the signal",
    title: "Turning the ask into one clear mission.",
    description: "Signal is being reduced to a single outcome the room can follow.",
    pulse: "The mission is taking shape."
  },
  recon: {
    chapter: "Read the product",
    title: "Reading the product surface.",
    description: "Cascade is mapping where the change lives and what it touches.",
    pulse: "The surface is in focus."
  },
  plan_locked: {
    chapter: "Lock the route",
    title: "Locking the route.",
    description: "The change surface, expected payoff, and success bar are now set.",
    pulse: "The route is locked."
  },
  execution_underway: {
    chapter: "Build the change",
    title: "Building the visible change.",
    description: "Cascade is reshaping the experience and keeping the update legible as it happens.",
    pulse: "The change is in motion."
  },
  verification: {
    chapter: "Check the result",
    title: "Checking the result before handoff.",
    description: "The update is being verified so the reveal lands cleanly.",
    pulse: "Proof is being assembled."
  },
  proof_delivered: {
    chapter: "Show the proof",
    title: "Proof is packaged and ready.",
    description: "What changed, why it matters, and what to do next are ready to share.",
    pulse: "The reveal is ready."
  },
  mission_blocked: {
    chapter: "Handle blocker",
    title: "A blocker was caught without losing context.",
    description: "Cascade logged the friction and preserved the clearest next move.",
    pulse: "The route needs review."
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
      title: "Pick the route",
      body: brief.implementationBrief,
      state: currentIndex >= 3 ? "complete" : currentIndex >= 2 ? "active" : "pending"
    },
    {
      title: "Show the win",
      body: brief.acceptanceCriteria[0] ?? "The update should feel obvious when it lands.",
      state: stage === "mission_blocked" ? "blocked" : currentIndex >= 4 ? "active" : "pending"
    }
  ];
}

export function getSupportPresentation(level: SupportLevel) {
  switch (level) {
    case "supported":
      return {
        label: "Live build-ready",
        body: "Cascade can scan, change, and verify this repo in the hosted demo."
      };
    case "advisory":
      return {
        label: "Strong planning fit",
        body: "Cascade can map the route clearly, even if execution stays advisory."
      };
    case "unsupported":
      return {
        label: "Advisory only",
        body: "Cascade can still frame the mission and handoff, but not patch this repo live."
      };
  }
}

export function getModelLabel(brief: MissionBrief) {
  return brief.modelSelection.activeModel ?? brief.modelSelection.requestedModel ?? "Heuristic mode";
}

export function getModelLane(brief: MissionBrief) {
  switch (brief.modelSelection.keyMode) {
    case "server":
      return "Hosted lane";
    case "user":
      return "Bring-your-own lane";
    case "none":
      return "Planning lane";
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
  const firstOutcome = brief.acceptanceCriteria[0] ?? "The change should feel clearer immediately.";
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
        detailTitle: "Why this mission",
        detailBody: brief.rationale,
        audienceTitle: "What should click",
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
        detailTitle: "Primary change surface",
        detailBody: `Cascade is centered on ${mainSurface} and the nearby UI that shapes the outcome.`,
        audienceTitle: "Why this matters",
        audienceBody: "The update should read as one deliberate move."
      };
    case "executor":
      return {
        role,
        name: agentPresentation[role].name,
        statusLabel: status.label,
        statusTone: status.tone,
        nodeTitle: agentPresentation[role].nodeTitle,
        summary: agentPresentation[role].summary,
        detailTitle: "Now building",
        detailBody: brief.implementationBrief,
        audienceTitle: "What users notice",
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
        detailTitle: "How proof gets earned",
        detailBody:
          proofCount > 0
            ? `${proofCount} proof point${proofCount === 1 ? "" : "s"} already back the handoff.`
            : "Proof is being assembled before the mission closes.",
        audienceTitle: "What this protects",
        audienceBody: "The handoff should feel credible at a glance."
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
