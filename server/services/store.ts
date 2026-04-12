import crypto from "node:crypto";
import type { ArtifactBundle, MissionBrief, MissionRun } from "../../shared/types";
import { terminalStages } from "../../shared/types";

const emptyArtifacts = (): ArtifactBundle => ({
  changedFiles: [],
  checks: [],
  screenshots: [],
  logs: [],
  summary: "Mission created. Awaiting recon.",
  blockers: [],
  nextSteps: []
});

const defaultAgents = () => ({
  pm: { role: "pm" as const, status: "active" as const, latestAction: "Parsing the mission ask.", progress: 18 },
  architect: { role: "architect" as const, status: "idle" as const, latestAction: "Waiting for repo scan.", progress: 0 },
  executor: { role: "executor" as const, status: "idle" as const, latestAction: "Standing by.", progress: 0 },
  qa: { role: "qa" as const, status: "idle" as const, latestAction: "Waiting for verification.", progress: 0 }
});

class MissionStore {
  private readonly missions = new Map<string, MissionRun>();
  private readonly subscribers = new Map<string, Set<() => void>>();

  createMission(brief: MissionBrief) {
    const id = `mission-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const mission: MissionRun = {
      id,
      createdAt: now,
      updatedAt: now,
      stage: "objective_received",
      brief,
      queuePosition: 0,
      agents: defaultAgents(),
      artifacts: emptyArtifacts()
    };

    this.missions.set(id, mission);
    this.notify(id);
    return mission;
  }

  getMission(id: string) {
    return this.missions.get(id);
  }

  getAllMissions() {
    return [...this.missions.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  hasActiveMission() {
    return this.getAllMissions().some((mission) => !terminalStages.includes(mission.stage));
  }

  updateMission(id: string, updater: (mission: MissionRun) => MissionRun) {
    const mission = this.missions.get(id);
    if (!mission) {
      throw new Error("Mission not found.");
    }

    const updated = updater({ ...mission, artifacts: { ...mission.artifacts } });
    updated.updatedAt = new Date().toISOString();
    this.missions.set(id, updated);
    this.notify(id);
    return updated;
  }

  subscribe(id: string, callback: () => void) {
    const set = this.subscribers.get(id) ?? new Set<() => void>();
    set.add(callback);
    this.subscribers.set(id, set);

    return () => {
      const current = this.subscribers.get(id);
      current?.delete(callback);
      if (current && current.size === 0) {
        this.subscribers.delete(id);
      }
    };
  }

  private notify(id: string) {
    const callbacks = this.subscribers.get(id);
    callbacks?.forEach((callback) => callback());
  }
}

export const store = new MissionStore();
