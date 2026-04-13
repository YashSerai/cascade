import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { ChangedFile, CheckArtifact, ExecutionPlan } from "../../../shared/types";
import { resolveApiKey, generateStructuredJson } from "../model";
import { getNpmCommand, readTextIfExists, runCommand, trimOutput, writeFileSafe } from "../files";
import type { ExecutionContext, ExecutionProvider, PlanResult } from "./provider";

const planSchema = z.object({
  approach: z.string(),
  targetFiles: z.array(z.string()).min(1).max(4),
  verificationStrategy: z.array(z.string()).min(1),
  notes: z.array(z.string()),
  edits: z
    .array(
      z.object({
        path: z.string(),
        summary: z.string(),
        content: z.string()
      })
    )
    .min(1)
    .max(4)
});

const planResponseSchema = {
  type: "object",
  properties: {
    approach: { type: "string" },
    targetFiles: { type: "array", items: { type: "string" } },
    verificationStrategy: { type: "array", items: { type: "string" } },
    notes: { type: "array", items: { type: "string" } },
    edits: {
      type: "array",
      items: {
        type: "object",
        properties: {
          path: { type: "string" },
          summary: { type: "string" },
          content: { type: "string" }
        },
        required: ["path", "summary", "content"]
      }
    }
  },
  required: ["approach", "targetFiles", "verificationStrategy", "notes", "edits"]
};

export class LocalGeminiExecutionProvider implements ExecutionProvider {
  async planTask(context: ExecutionContext): Promise<PlanResult> {
    const editableFiles = await gatherEditableFiles(context.workspace, context.brief.repoScan.importantFiles);

    if (editableFiles.length === 0) {
      throw new Error("Cascade could not find a safe set of editable UI files in this repository.");
    }

    const { apiKey, keyMode, provider, clientOptions } = resolveApiKey(context.apiKey);
    if (!apiKey) {
      throw new Error("Gemini API key missing. Add a server key or provide BYOK in the UI to run execution.");
    }

    const result = await generateStructuredJson({
      apiKey,
      keyMode,
      provider,
      clientOptions,
      schema: planSchema,
      responseSchema: planResponseSchema,
      systemInstruction:
        "You are Cascade Executor. Rewrite only the supplied files to implement the mission. Keep edits coherent, conservative, and buildable. Return JSON only.",
      prompt: buildPlanningPrompt(context.brief, editableFiles)
    });

    const allowedPaths = new Set(editableFiles.map((file) => file.path));
    const filteredEdits = result.data.edits.filter((edit) => allowedPaths.has(edit.path));

    if (filteredEdits.length === 0) {
      throw new Error("Gemini did not return edits for the approved files.");
    }

    const plan: ExecutionPlan = {
      approach: result.data.approach,
      targetFiles: result.data.targetFiles.filter((file) => allowedPaths.has(file)),
      verificationStrategy: result.data.verificationStrategy,
      notes: result.data.notes
    };

    return {
      plan,
      edits: filteredEdits
    };
  }

  async executeTask(context: ExecutionContext, plan: PlanResult): Promise<ChangedFile[]> {
    const changedFiles: ChangedFile[] = [];

    for (const edit of plan.edits) {
      const existing = await readTextIfExists(path.join(context.workspace, edit.path));
      if (existing === edit.content) {
        continue;
      }

      await writeFileSafe(context.workspace, edit.path, edit.content);
      changedFiles.push({ path: edit.path, summary: edit.summary });
    }

    if (changedFiles.length === 0) {
      throw new Error("Gemini returned a plan, but none of the file contents changed.");
    }

    return changedFiles;
  }

  async runChecks(context: ExecutionContext): Promise<CheckArtifact[]> {
    const checks: CheckArtifact[] = [];
    const npm = getNpmCommand();
    const installResult = await runCommand(npm, ["install", "--no-audit", "--no-fund"], context.workspace, 420000);

    checks.push({
      name: "install",
      status: installResult.ok ? "passed" : "failed",
      command: "npm install --no-audit --no-fund",
      output: trimOutput(`${installResult.stdout}\n${installResult.stderr}\n${installResult.message ?? ""}`.trim())
    });

    if (!installResult.ok) {
      return checks;
    }

    const verificationCommand = context.brief.repoScan.buildCommand ? ["run", "build"] : context.brief.repoScan.testCommand ? ["run", "test"] : null;
    if (!verificationCommand) {
      checks.push({
        name: "verification",
        status: "skipped",
        output: "No build or test script was detected for this repo."
      });
      return checks;
    }

    const verifyResult = await runCommand(npm, verificationCommand, context.workspace, 420000);
    checks.push({
      name: verificationCommand[1],
      status: verifyResult.ok ? "passed" : "failed",
      command: `npm ${verificationCommand.join(" ")}`,
      output: trimOutput(`${verifyResult.stdout}\n${verifyResult.stderr}\n${verifyResult.message ?? ""}`.trim())
    });

    return checks;
  }

  async collectArtifacts(_context: ExecutionContext, _plan: PlanResult, changedFiles: ChangedFile[], checks: CheckArtifact[]) {
    const blockers = checks.filter((check) => check.status === "failed").map((check) => `${check.name} failed. Review the verification output.`);
    const passedChecks = checks.filter((check) => check.status === "passed").map((check) => check.name);
    const pullRequestDraft = {
      title: _context.brief.routePlan.prTitle || _context.brief.selectedObjective,
      summary:
        blockers.length === 0
          ? _context.brief.routePlan.prSummary
          : `${_context.brief.routePlan.prSummary} Verification still surfaced blocker details that need a follow-up pass.`,
      checklist: [
        `Changed files: ${changedFiles.map((file) => file.path).join(", ") || "none yet"}.`,
        `Verification: ${checks.map((check) => `${check.name}:${check.status}`).join(", ") || "none recorded"}.`,
        `Proof targets: ${_context.brief.routePlan.proofTargets.join(" | ")}`
      ]
    };
    return {
      summary:
        blockers.length === 0
          ? `Cascade updated ${changedFiles.map((file) => file.path).join(", ")} and verified the mission through ${passedChecks.join(", ") || "available checks"}.`
          : `Cascade applied a real patch to ${changedFiles.map((file) => file.path).join(", ")}, but verification uncovered blockers that need another pass.`,
      blockers,
      nextSteps:
        blockers.length === 0
          ? [
              "Capture screenshots or a short screen recording for the demo thread.",
              "Use Continue Working to hand the mission off for a second refinement pass."
            ]
          : [
              "Inspect the failing command output in the proof bundle.",
              "Use Continue Working to feed the repo state and the blocker back into another coding agent."
            ],
      pullRequestDraft,
      screenshots: []
    };
  }
}

async function gatherEditableFiles(workspace: string, candidatePaths: string[]) {
  const files: { path: string; content: string }[] = [];

  for (const candidate of candidatePaths) {
    if (!/\.(tsx|jsx|ts|js|css|html)$/.test(candidate)) {
      continue;
    }
    const absolutePath = path.join(workspace, candidate);
    try {
      const content = await fs.readFile(absolutePath, "utf8");
      if (content.length <= 24000) {
        files.push({ path: candidate, content });
      }
    } catch {
      // Ignore unreadable files.
    }
    if (files.length >= 4) {
      break;
    }
  }

  return files;
}

function buildPlanningPrompt(brief: ExecutionContext["brief"], editableFiles: { path: string; content: string }[]) {
  return [
    `Mission title: ${brief.missionTitle}`,
    `Objective: ${brief.selectedObjective}`,
    `Mode: ${brief.mode}`,
    `Repo framework: ${brief.repoScan.framework}`,
    `Support reason: ${brief.repoScan.supportReason}`,
    `Acceptance criteria: ${brief.acceptanceCriteria.join(" | ")}`,
    `Impacted areas: ${brief.impactedAreas.join(", ")}`,
    `Implementation brief: ${brief.implementationBrief}`,
    "",
    "You may only rewrite the supplied files. Keep the app buildable and preserve the project's style.",
    "Prefer a visible UX improvement so the proof bundle is demo-friendly.",
    "",
    ...editableFiles.flatMap((file) => [`FILE: ${file.path}`, file.content, "", "---"])
  ].join("\n");
}
