import type { ChangedFile, CheckArtifact, ExecutionPlan, MissionBrief, PullRequestDraft, ScreenshotArtifact } from "../../../shared/types";

export interface PlannedEdit {
  path: string;
  summary: string;
  content: string;
}

export interface ExecutionContext {
  workspace: string;
  brief: MissionBrief;
  apiKey?: string;
}

export interface PlanResult {
  plan: ExecutionPlan;
  edits: PlannedEdit[];
}

/** Options for {@link ExecutionProvider.runChecks}. */
export interface RunChecksOptions {
  /** When true, skip npm install and only run build/test (repair re-verify after a successful install). */
  skipInstall?: boolean;
}

export interface ExecutionProvider {
  planTask(context: ExecutionContext): Promise<PlanResult>;
  executeTask(context: ExecutionContext, plan: PlanResult): Promise<ChangedFile[]>;
  runChecks(context: ExecutionContext, options?: RunChecksOptions): Promise<CheckArtifact[]>;
  collectArtifacts(
    context: ExecutionContext,
    plan: PlanResult,
    changedFiles: ChangedFile[],
    checks: CheckArtifact[]
  ): Promise<{
    summary: string;
    blockers: string[];
    nextSteps: string[];
    pullRequestDraft: PullRequestDraft;
    screenshots: ScreenshotArtifact[];
  }>;
}
