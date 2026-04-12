import type { MissionRun } from "../../shared/types";

export function buildBriefMarkdown(mission: MissionRun) {
  const { brief, artifacts } = mission;
  return [
    `# ${brief.missionTitle}`,
    "",
    `- Repo: ${brief.repoTarget.repoUrl}`,
    `- Mode: ${brief.mode}`,
    `- Stage: ${mission.stage}`,
    `- Support lane: ${brief.repoScan.supportLevel}`,
    `- Active model: ${brief.modelSelection.activeModel ?? "heuristic fallback"}`,
    "",
    "## Objective",
    brief.selectedObjective,
    "",
    "## Rationale",
    brief.rationale,
    "",
    "## Acceptance Criteria",
    ...brief.acceptanceCriteria.map((item) => `- ${item}`),
    "",
    "## Impacted Areas",
    ...brief.impactedAreas.map((item) => `- ${item}`),
    "",
    "## Execution Plan",
    artifacts.executionPlan?.approach ?? "No live execution plan was generated.",
    "",
    "## Changed Files",
    ...(artifacts.changedFiles.length > 0 ? artifacts.changedFiles.map((file) => `- ${file.path}: ${file.summary}`) : ["- No changed files recorded."]),
    "",
    "## Checks",
    ...(artifacts.checks.length > 0
      ? artifacts.checks.map((check) => `- ${check.name}: ${check.status}${check.command ? ` (${check.command})` : ""}`)
      : ["- No checks recorded."]),
    "",
    "## Summary",
    artifacts.summary,
    "",
    "## Blockers",
    ...(artifacts.blockers.length > 0 ? artifacts.blockers.map((item) => `- ${item}`) : ["- None."]),
    "",
    "## Suggested Next Steps",
    ...(artifacts.nextSteps.length > 0 ? artifacts.nextSteps.map((item) => `- ${item}`) : ["- No additional next steps were generated."]),
    ""
  ].join("\n");
}

export function buildContinuePrompt(mission: MissionRun) {
  const { brief, artifacts } = mission;
  return [
    "You are continuing a partially completed Cascade mission.",
    "",
    `Repository: ${brief.repoTarget.repoUrl}`,
    `Mode: ${brief.mode}`,
    `Objective: ${brief.selectedObjective}`,
    `Support lane: ${brief.repoScan.supportLevel}`,
    `Target path: ${brief.repoTarget.targetPath ?? "none"}`,
    "",
    "Acceptance criteria:",
    ...brief.acceptanceCriteria.map((item) => `- ${item}`),
    "",
    "Impacted areas:",
    ...brief.impactedAreas.map((item) => `- ${item}`),
    "",
    "Changed files so far:",
    ...(artifacts.changedFiles.length > 0 ? artifacts.changedFiles.map((file) => `- ${file.path}: ${file.summary}`) : ["- No files changed yet."]),
    "",
    "Verification status:",
    ...(artifacts.checks.length > 0
      ? artifacts.checks.map((check) => `- ${check.name}: ${check.status}. ${check.output.slice(0, 500)}`)
      : ["- No checks ran."]),
    "",
    "Known blockers:",
    ...(artifacts.blockers.length > 0 ? artifacts.blockers.map((item) => `- ${item}`) : ["- None recorded."]),
    "",
    "Recommended next commands:",
    ...buildNextCommands(brief.repoScan),
    "",
    "Goal:",
    "Finish the implementation, resolve blockers, and leave the repo in a verifiable state."
  ].join("\n");
}

function buildNextCommands(scan: MissionRun["brief"]["repoScan"]) {
  const commands = [scan.installCommand, scan.buildCommand, scan.testCommand].filter(Boolean) as string[];
  return commands.length > 0 ? commands.map((command) => `- ${command}`) : ["- Determine install/build commands for this repo."];
}
