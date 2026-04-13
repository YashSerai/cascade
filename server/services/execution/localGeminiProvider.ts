import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { ChangedFile, CheckArtifact, ExecutionPlan } from "../../../shared/types";
import { resolveApiKey, generateStructuredJson } from "../model";
import { getNpmCommand, readTextIfExists, runCommand, trimOutput, writeFileSafe } from "../files";
import type { ExecutionContext, ExecutionProvider, PlanResult } from "./provider";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Map snake_case keys some Gemini variants emit for the execution plan. */
function mergePlanKeyAliases(o: Record<string, unknown>): Record<string, unknown> {
  const out = { ...o };
  if (out.targetFiles === undefined && Array.isArray(out.target_files)) {
    out.targetFiles = out.target_files;
  }
  if (out.verificationStrategy === undefined && Array.isArray(out.verification_strategy)) {
    out.verificationStrategy = out.verification_strategy;
  }
  return out;
}

function stringListFromUnknown(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function coerceEditEntry(raw: unknown): { path: string; summary: string; content: string } | null {
  if (!isPlainObject(raw)) {
    return null;
  }
  const pathVal = raw.path ?? raw.file ?? raw.filePath ?? raw.filepath ?? raw.target ?? raw.filename;
  const summaryVal = raw.summary ?? raw.description ?? raw.change_summary ?? raw.message ?? raw.title;
  const contentVal = raw.content ?? raw.newContent ?? raw.body ?? raw.code ?? raw.text ?? raw.patch ?? raw.updatedContent;
  if (typeof pathVal !== "string" || !pathVal.trim()) {
    return null;
  }
  if (typeof contentVal !== "string") {
    return null;
  }
  const summary =
    typeof summaryVal === "string" && summaryVal.trim() ? summaryVal.trim() : `Update ${pathVal}`;
  return { path: pathVal.trim(), summary, content: contentVal };
}

/**
 * Gemini repair responses often use a single string for verificationStrategy/notes, or alternate edit keys.
 */
function coerceLoosePlanFields(o: Record<string, unknown>): Record<string, unknown> {
  const out = { ...o };

  let vs = stringListFromUnknown(out.verificationStrategy);
  if (vs.length === 0) {
    vs = ["npm run build"];
  }
  out.verificationStrategy = vs;

  out.notes = stringListFromUnknown(out.notes);

  let tf = stringListFromUnknown(out.targetFiles);
  if (tf.length === 0 && typeof out.targetFiles === "string") {
    tf = stringListFromUnknown(out.targetFiles);
  }
  if (tf.length > 0) {
    out.targetFiles = tf.slice(0, 4);
  }

  if (Array.isArray(out.edits)) {
    const mapped = out.edits.map(coerceEditEntry).filter((e): e is NonNullable<typeof e> => e !== null);
    out.edits = mapped;
  }

  if (typeof out.approach !== "string" || !out.approach.trim()) {
    out.approach = "Apply conservative fixes to satisfy the mission and passing checks.";
  } else {
    out.approach = out.approach.trim();
  }

  return out;
}

function finalizePlanObject(value: unknown): unknown {
  if (!isPlainObject(value)) {
    return value;
  }
  return coerceLoosePlanFields(mergePlanKeyAliases(value));
}

/**
 * Gemini sometimes nests the plan or returns multiple sibling objects; `coerceModelJsonRoot` may
 * pick the wrong one by key count. Prefer objects that include `edits`, unwrap `plan` / `data`, etc.
 */
export function normalizePlanPayload(value: unknown): unknown {
  let v: unknown = value;

  for (let depth = 0; depth < 10; depth++) {
    if (Array.isArray(v)) {
      const objs = v.filter(isPlainObject);
      if (objs.length === 0) {
        return v;
      }
      const withEdits = objs.find((o) => Array.isArray(o.edits) && o.edits.length > 0);
      v = withEdits ?? objs.find((o) => typeof o.approach === "string") ?? objs.reduce((a, b) =>
        Object.keys(a).length >= Object.keys(b).length ? a : b
      );
      continue;
    }

    if (!isPlainObject(v)) {
      return v;
    }

    const o = mergePlanKeyAliases(v);
    const inner =
      o.plan ??
      o.executionPlan ??
      o.execution_plan ??
      o.patch ??
      o.data ??
      o.result ??
      o.output ??
      o.response;

    if (isPlainObject(inner)) {
      v = mergePlanKeyAliases(inner);
      continue;
    }

    return finalizePlanObject(o);
  }

  return isPlainObject(v) ? finalizePlanObject(v) : v;
}

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
      throw new Error("Gemini API key missing. Add a key in the UI or configure one on the server to run execution.");
    }

    const result = await generateStructuredJson({
      apiKey,
      keyMode,
      provider,
      clientOptions,
      schema: planSchema,
      responseSchema: planResponseSchema,
      normalizeParsed: normalizePlanPayload,
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
    // Cloud Run sets NODE_ENV=production; npm then skips devDependencies and TypeScript
    // builds fail without @types/react. Force a dev-capable install for verification.
    const installArgs = ["install", "--no-audit", "--no-fund", "--include=dev"];
    const installResult = await runCommand(npm, installArgs, context.workspace, 420000, {
      env: { ...process.env, NODE_ENV: "development" }
    });

    checks.push({
      name: "install",
      status: installResult.ok ? "passed" : "failed",
      command: "npm install --no-audit --no-fund --include=dev",
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

  async repairTask(context: ExecutionContext, changedFiles: ChangedFile[], failedChecks: CheckArtifact[]): Promise<ChangedFile[]> {
    const currentFiles: { path: string; content: string }[] = [];
    for (const file of changedFiles) {
      const content = await readTextIfExists(path.join(context.workspace, file.path));
      if (content) {
        currentFiles.push({ path: file.path, content });
      }
    }

    if (currentFiles.length === 0) {
      throw new Error("No changed files could be read back for the repair pass.");
    }

    const { apiKey, keyMode, provider, clientOptions } = resolveApiKey(context.apiKey);
    if (!apiKey) {
      throw new Error("Gemini API key missing for repair pass.");
    }

    const errorOutput = failedChecks
      .map((check) => `Command: ${check.command ?? check.name}\nStatus: ${check.status}\nOutput:\n${check.output}`)
      .join("\n\n---\n\n");

    const result = await generateStructuredJson({
      apiKey,
      keyMode,
      provider,
      clientOptions,
      schema: planSchema,
      responseSchema: planResponseSchema,
      normalizeParsed: normalizePlanPayload,
      systemInstruction:
        "You are Cascade Executor running a repair pass. The previous patch broke the build or tests. Read the error output carefully, then rewrite the supplied files to fix the errors while preserving the intended feature. Keep the app buildable. Return JSON only.",
      prompt: buildRepairPrompt(context.brief, currentFiles, errorOutput)
    });

    const allowedPaths = new Set(currentFiles.map((f) => f.path));
    const filteredEdits = result.data.edits.filter((edit) => allowedPaths.has(edit.path));

    if (filteredEdits.length === 0) {
      throw new Error("Gemini repair pass did not produce edits for the changed files.");
    }

    const repairedFiles: ChangedFile[] = [];
    for (const edit of filteredEdits) {
      const existing = await readTextIfExists(path.join(context.workspace, edit.path));
      if (existing === edit.content) {
        continue;
      }
      await writeFileSafe(context.workspace, edit.path, edit.content);
      repairedFiles.push({ path: edit.path, summary: edit.summary });
    }

    return repairedFiles.length > 0 ? repairedFiles : changedFiles;
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
              "Review the changes and capture screenshots for the demo.",
              "Use Continue Working for a refinement pass if needed."
            ]
          : [
              "Cascade tried to self-repair but the issue persisted after multiple attempts.",
              "Use Continue Working to hand the mission to another agent with more context."
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
    "Return JSON only as one flat object with these top-level keys exactly: approach (string), targetFiles (string array), verificationStrategy (string array), notes (string array), edits (array of { path, summary, content }).",
    "Do not nest that object under plan, data, result, or wrap it in an array.",
    "",
    ...editableFiles.flatMap((file) => [`FILE: ${file.path}`, file.content, "", "---"])
  ].join("\n");
}

function buildRepairPrompt(brief: ExecutionContext["brief"], currentFiles: { path: string; content: string }[], errorOutput: string) {
  return [
    `Mission title: ${brief.missionTitle}`,
    `Objective: ${brief.selectedObjective}`,
    `Repo framework: ${brief.repoScan.framework}`,
    "",
    "REPAIR PASS: The previous implementation attempt broke the build or tests.",
    "Fix the errors shown below while keeping the intended feature intact.",
    "You may only rewrite the supplied files. The app MUST build cleanly after your edits.",
    "",
    "BUILD/TEST ERROR OUTPUT:",
    errorOutput,
    "",
    "CURRENT FILE STATE (after the broken patch):",
    ...currentFiles.flatMap((file) => [`FILE: ${file.path}`, file.content, "", "---"]),
    "",
    "Return JSON only as one flat object with top-level keys: approach, targetFiles, verificationStrategy, notes, edits (same shape as the initial plan). Do not nest under plan or data."
  ].join("\n");
}
