import type { AnalyzeResponse, MissionRun, StartMissionResponse } from "../../shared/types";

async function request<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(error?.error ?? `Request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

export function analyzeMission(payload: {
  repoUrl: string;
  mode: "discover" | "mission";
  promptText: string;
  apiKey?: string;
}) {
  return request<AnalyzeResponse>("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export function startMission(payload: { brief: unknown; apiKey?: string }) {
  return request<StartMissionResponse>("/api/missions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export async function getContinuePrompt(missionId: string) {
  const response = await fetch(`/api/missions/${missionId}/continue.txt`);
  if (!response.ok) {
    throw new Error("Unable to load the continue-working prompt.");
  }
  return response.text();
}

export function subscribeToMission(missionId: string, onMessage: (mission: MissionRun) => void) {
  const source = new EventSource(`/api/missions/${missionId}/events`);
  source.onmessage = (event) => {
    onMessage(JSON.parse(event.data) as MissionRun);
  };
  source.onerror = () => {
    source.close();
  };
  return () => source.close();
}
