import type {
  AgentRole,
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
    roleLabel: string;
    orbitClass: string;
    summary: string;
  }
> = {
  pm: {
    name: "Pathfinder",
    roleLabel: "PM",
    orbitClass: "agent-pm",
    summary: "Frames the user promise and decides what is worth shipping."
  },
  architect: {
    name: "Cartographer",
    roleLabel: "Architect",
    orbitClass: "agent-architect",
    summary: "Maps the repo, finds the leverage points, and narrows the route."
  },
  executor: {
    name: "Maker",
    roleLabel: "Executor",
    orbitClass: "agent-executor",
    summary: "Moves through the codebase and applies the visible change."
  },
  qa: {
    name: "Sentinel",
    roleLabel: "QA",
    orbitClass: "agent-qa",
    summary: "Verifies the result and packages the handoff."
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
    chapter: "Capture the Ask",
    title: "The ask becomes a mission worth showing on screen.",
    description: "Cascade translates raw input into a concrete destination and a user-facing promise.",
    pulse: "Signal converted into a mission target."
  },
  recon: {
    chapter: "Read the Repo",
    title: "The repo is being read for leverage, not just scanned for files.",
    description: "Framework shape, constraints, impact zones, and likely routes are being mapped into one coherent path.",
    pulse: "Repo structure, framework, and impact zones are coming into focus."
  },
  plan_locked: {
    chapter: "Choose the Route",
    title: "The route is locked and the acceptance bar is now explicit.",
    description: "Cascade has picked the best journey for the ask and framed how success will be judged.",
    pulse: "The route is chosen and the acceptance bar is locked."
  },
  execution_underway: {
    chapter: "Build the Change",
    title: "The main build sequence is in motion.",
    description: "Agents are now inside the change surface, pushing toward the visible product outcome instead of streaming raw terminal chatter.",
    pulse: "The active patch is moving through the repo surface."
  },
  verification: {
    chapter: "Verify the Result",
    title: "The experience is being checked before the reveal.",
    description: "Cascade is collecting proof, validation, and the confidence layer that turns a patch into a believable result.",
    pulse: "Checks and proof are being gathered before the reveal."
  },
  proof_delivered: {
    chapter: "Package the Handoff",
    title: "The mission has landed and the proof vault is open.",
    description: "Changed surfaces, checks, next steps, and continuation artifacts are now ready for the user-facing handoff.",
    pulse: "The mission is packaged with proof and next steps."
  },
  mission_blocked: {
    chapter: "Route Interrupted",
    title: "The route hit a blocker, but the mission remains legible.",
    description: "Cascade preserves context, evidence, and the cleanest next move so the run still ends with clarity instead of confusion.",
    pulse: "The route was interrupted, and the blocker was preserved with context."
  }
};

export interface ChapterState {
  stage: Exclude<MissionStage, "mission_blocked">;
  chapter: string;
  pulse: string;
  state: "complete" | "active" | "pending" | "blocked";
}

export function getMissionProgress(stage: MissionStage) {
  if (stage === "mission_blocked") {
    return 82;
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

export function getSupportPresentation(level: SupportLevel) {
  switch (level) {
    case "supported":
      return {
        label: "Live execution ready",
        body: "Cascade can analyze, patch, and verify this lane in the hosted demo."
      };
    case "advisory":
      return {
        label: "Guided mission preview",
        body: "Cascade can chart the journey and surface the best route, but execution may stay advisory."
      };
    case "unsupported":
      return {
        label: "Visual planning only",
        body: "The experience can still frame the mission, but live patching is outside the supported lane."
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

export interface StoryMoment {
  eyebrow: string;
  title: string;
  body: string;
}

export function buildStoryMoments(brief: MissionBrief, mission: MissionRun): StoryMoment[] {
  const stageInfo = stagePresentation[mission.stage];
  const activeAgent =
    agentOrder
      .map((role) => mission.agents[role])
      .find((agent) => agent.status === "active" || agent.status === "blocked") ?? mission.agents.executor;

  const leadPain = brief.painPoints[0] ?? brief.rationale;
  const keyImpact = brief.impactedAreas[0] ?? brief.repoScan.targetPathHint ?? "primary product surface";

  return [
    {
      eyebrow: "Mission focus",
      title: brief.selectedObjective,
      body: stageInfo.description
    },
    {
      eyebrow: `${agentPresentation[activeAgent.role].name} in motion`,
      title: activeAgent.latestAction,
      body: `${agentPresentation[activeAgent.role].summary} Current progress: ${activeAgent.progress}%.`
    },
    {
      eyebrow: "User outcome",
      title: leadPain,
      body: `The visible change is being shaped around ${keyImpact}, with the goal of making the experience feel clearer and more trustworthy.`
    }
  ];
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
