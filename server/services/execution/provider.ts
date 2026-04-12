import type { ChangedFile, CheckArtifact, ExecutionPlan, MissionBrief } from "../../../shared/types";

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

export interface ExecutionProvider {
  planTask(context: ExecutionContext): Promise<PlanResult>;
  executeTask(context: ExecutionContext, plan: PlanResult): Promise<ChangedFile[]>;
  runChecks(context: ExecutionContext): Promise<CheckArtifact[]>;
  collectArtifacts(
    context: ExecutionContext,
    plan: PlanResult,
    changedFiles: ChangedFile[],
    checks: CheckArtifact[]
  ): Promise<{
    summary: string;
    blockers: string[];
    nextSteps: string[];
  }>;
}
