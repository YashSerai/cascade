import type { AgentRole, MissionRun } from "../../shared/types";
import { cloneRepository, safeRemove } from "./github";
import { LocalGeminiExecutionProvider } from "./execution/localGeminiProvider";
import { store } from "./store";

const provider = new LocalGeminiExecutionProvider();

export async function runMission(missionId: string, apiKey?: string) {
  const mission = store.getMission(missionId);
  if (!mission) {
    return;
  }

  let workspace = "";

  try {
    appendLog(missionId, "info", "Objective received. Locking the mission and preparing recon.");
    updateStage(missionId, "recon");
    setAgent(missionId, "pm", "done", "Framed the mission and locked the objective.", 100);
    setAgent(missionId, "architect", "active", "Shallow-cloning the repository and mapping the change surface.", 26);

    workspace = await cloneRepository(mission.brief.repoTarget);

    appendLog(missionId, "info", `Recon complete. ${mission.brief.repoScan.supportReason}`);
    const latest = store.updateMission(missionId, (current) => ({
      ...current,
      stage: "plan_locked",
      artifacts: {
        ...current.artifacts,
        summary: "Recon complete. Planning edits and verification strategy.",
        nextSteps: []
      }
    }));

    if (latest.brief.repoScan.supportLevel !== "supported") {
      setAgent(missionId, "architect", "done", "Delivered an advisory execution path based on the repo scan.", 100);
      setAgent(missionId, "executor", "blocked", "This repo is outside the current live execution lane.", 100);
      setAgent(missionId, "qa", "done", "Packed blockers and continuation guidance.", 100);
      store.updateMission(missionId, (current) => ({
        ...current,
        stage: "mission_blocked",
        artifacts: {
          ...current.artifacts,
          blockers: [current.brief.repoScan.supportReason],
          summary:
            "Cascade completed the analysis, but kept execution in advisory mode because the repo falls outside the supported JS/TS npm web lane.",
          nextSteps: [
            "Use Continue Working to hand this repo to a coding agent with a broader runtime.",
            "Try a supported npm-based web repo for a full live mission."
          ]
        }
      }));
      return;
    }

    setAgent(missionId, "architect", "done", "Locked the plan and selected the files for execution.", 100);
    setAgent(missionId, "executor", "active", "Generating the implementation patch with Gemini.", 38);

    const plan = await provider.planTask({ workspace, brief: latest.brief, apiKey });
    store.updateMission(missionId, (current) => ({
      ...current,
      artifacts: {
        ...current.artifacts,
        executionPlan: plan.plan,
        summary: "Plan locked. Executor is applying the patch."
      }
    }));

    updateStage(missionId, "execution_underway");
    appendLog(missionId, "info", `Plan locked for ${plan.plan.targetFiles.join(", ")}.`);

    const changedFiles = await provider.executeTask({ workspace, brief: latest.brief, apiKey }, plan);
    setAgent(missionId, "executor", "done", "Applied the implementation patch and staged proof artifacts.", 100);
    setAgent(missionId, "qa", "active", "Running install and verification commands.", 42);
    store.updateMission(missionId, (current) => ({
      ...current,
      stage: "verification",
      artifacts: {
        ...current.artifacts,
        changedFiles,
        summary: "Patch applied. Running verification."
      }
    }));

    const checks = await provider.runChecks({ workspace, brief: latest.brief, apiKey });
    const collected = await provider.collectArtifacts({ workspace, brief: latest.brief, apiKey }, plan, changedFiles, checks);
    const stage = collected.blockers.length > 0 ? "mission_blocked" : "proof_delivered";

    setAgent(
      missionId,
      "qa",
      collected.blockers.length > 0 ? "blocked" : "done",
      collected.blockers.length > 0 ? "Verification found blockers. Proof is still packaged." : "Verification passed and proof is unlocked.",
      100
    );
    store.updateMission(missionId, (current) => ({
      ...current,
      stage,
      artifacts: {
        ...current.artifacts,
        checks,
        summary: collected.summary,
        blockers: collected.blockers,
        nextSteps: collected.nextSteps
      }
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mission failed unexpectedly.";
    appendLog(missionId, "error", message);
    setAgent(missionId, "executor", "blocked", message, 100);
    setAgent(missionId, "qa", "done", "Bundled the blocker state for export.", 100);
    store.updateMission(missionId, (current) => ({
      ...current,
      stage: "mission_blocked",
      artifacts: {
        ...current.artifacts,
        blockers: [...current.artifacts.blockers, message],
        summary: "Cascade hit a blocker before proof could be fully delivered.",
        nextSteps: [
          "Review the blocker details in the mission log.",
          "Rerun the mission with BYOK or a simpler supported repo."
        ]
      }
    }));
  } finally {
    if (workspace) {
      await safeRemove(workspace);
    }
  }
}

function updateStage(missionId: string, stage: MissionRun["stage"]) {
  store.updateMission(missionId, (mission) => ({ ...mission, stage }));
}

function setAgent(
  missionId: string,
  role: AgentRole,
  status: MissionRun["agents"][AgentRole]["status"],
  latestAction: string,
  progress: number
) {
  store.updateMission(missionId, (mission) => ({
    ...mission,
    agents: {
      ...mission.agents,
      [role]: {
        ...mission.agents[role],
        status,
        latestAction,
        progress
      }
    }
  }));
}

function appendLog(missionId: string, level: "info" | "warn" | "error", message: string) {
  store.updateMission(missionId, (mission) => ({
    ...mission,
    artifacts: {
      ...mission.artifacts,
      logs: [
        ...mission.artifacts.logs,
        {
          timestamp: new Date().toISOString(),
          level,
          message
        }
      ]
    }
  }));
}
