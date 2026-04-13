export const missionModes = ["discover", "mission"] as const;
export type MissionMode = (typeof missionModes)[number];

export const missionStages = [
  "objective_received",
  "recon",
  "plan_locked",
  "execution_underway",
  "verification",
  "proof_delivered",
  "mission_blocked"
] as const;
export type MissionStage = (typeof missionStages)[number];

export const terminalStages: MissionStage[] = ["proof_delivered", "mission_blocked"];

export const supportLevels = ["supported", "advisory", "unsupported"] as const;
export type SupportLevel = (typeof supportLevels)[number];

export const agentRoles = ["pm", "architect", "executor", "qa"] as const;
export type AgentRole = (typeof agentRoles)[number];

export const agentStatuses = ["idle", "active", "done", "blocked"] as const;
export type AgentStatus = (typeof agentStatuses)[number];

export type KeyMode = "server" | "user" | "none";
export type ModelProvider = "gemini-developer" | "vertex-ai" | "none";

export interface RepoTarget {
  inputUrl: string;
  repoUrl: string;
  owner: string;
  repo: string;
  cloneUrl: string;
  ref?: string;
  targetPath?: string;
}

export interface RepoScan {
  framework: string;
  packageManager: string;
  supportLevel: SupportLevel;
  supportReason: string;
  installCommand?: string;
  buildCommand?: string;
  testCommand?: string;
  importantFiles: string[];
  importantFileSummaries: Array<{
    path: string;
    summary: string;
  }>;
  risks: string[];
  rootScripts: string[];
  targetPathHint?: string;
}

export interface ModelSelection {
  requestedModel: string;
  fallbackModel: string;
  attemptedModels: string[];
  activeModel?: string;
  fallbackUsed: boolean;
  keyMode: KeyMode;
  provider: ModelProvider;
}

export interface RouteRoleFocus {
  role: AgentRole;
  headline: string;
  currentLens: string;
  repoHook: string;
  successSignal: string;
  filePaths: string[];
}

export interface RouteStep {
  label: string;
  detail: string;
}

export interface RouteFileMap {
  path: string;
  reason: string;
  phase: "scan" | "shape" | "verify";
}

export interface RoutePlan {
  routeHeadline: string;
  routeSummary: string;
  whyThisRoute: string;
  loadingSteps: RouteStep[];
  journeyMoments: string[];
  proofTargets: string[];
  fileMap: RouteFileMap[];
  roleFocus: Record<AgentRole, RouteRoleFocus>;
  prTitle: string;
  prSummary: string;
}

export interface MissionBrief {
  missionTitle: string;
  mode: MissionMode;
  repoTarget: RepoTarget;
  repoScan: RepoScan;
  selectedObjective: string;
  rationale: string;
  confidence: number;
  painPoints: string[];
  candidateFeatures: string[];
  acceptanceCriteria: string[];
  impactedAreas: string[];
  implementationBrief: string;
  routePlan: RoutePlan;
  modelSelection: ModelSelection;
}

export interface AgentState {
  role: AgentRole;
  status: AgentStatus;
  latestAction: string;
  progress: number;
}

export interface ChangedFile {
  path: string;
  summary: string;
}

export interface CheckArtifact {
  name: string;
  status: "passed" | "failed" | "skipped";
  command?: string;
  output: string;
}

export interface ScreenshotArtifact {
  label: string;
  url: string;
}

export interface PullRequestDraft {
  title: string;
  summary: string;
  checklist: string[];
}

export interface LogEntry {
  timestamp: string;
  message: string;
  level: "info" | "warn" | "error";
}

export interface ExecutionPlan {
  approach: string;
  targetFiles: string[];
  verificationStrategy: string[];
  notes: string[];
}

export interface ArtifactBundle {
  executionPlan?: ExecutionPlan;
  changedFiles: ChangedFile[];
  checks: CheckArtifact[];
  screenshots: ScreenshotArtifact[];
  pullRequestDraft?: PullRequestDraft;
  logs: LogEntry[];
  summary: string;
  blockers: string[];
  nextSteps: string[];
}

export interface MissionRun {
  id: string;
  createdAt: string;
  updatedAt: string;
  stage: MissionStage;
  brief: MissionBrief;
  queuePosition: number;
  agents: Record<AgentRole, AgentState>;
  artifacts: ArtifactBundle;
}

export interface AnalyzeRequest {
  repoUrl: string;
  mode: MissionMode;
  promptText: string;
  apiKey?: string;
}

export interface AnalyzeResponse {
  brief: MissionBrief;
}

export interface StartMissionRequest {
  brief: MissionBrief;
  apiKey?: string;
}

export interface StartMissionResponse {
  mission: MissionRun;
}

export interface ContinuePromptResponse {
  content: string;
}
