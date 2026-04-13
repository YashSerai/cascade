import path from "node:path";
import type { RepoScan, RepoTarget, SupportLevel } from "../../shared/types";
import { cloneRepository, safeRemove } from "./github";
import { listRepoFiles, readJsonIfExists, readTextIfExists } from "./files";

interface PackageJsonLike {
  name?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  packageManager?: string;
}

export async function scanRepository(repoTarget: RepoTarget) {
  const workspace = await cloneRepository(repoTarget);

  try {
    return await scanLocalWorkspace(workspace, repoTarget);
  } finally {
    await safeRemove(workspace);
  }
}

export async function scanLocalWorkspace(workspace: string, repoTarget: RepoTarget): Promise<RepoScan> {
  const files = await listRepoFiles(workspace);
  const packageJson = await readJsonIfExists<PackageJsonLike>(path.join(workspace, "package.json"));
  const scripts = packageJson?.scripts ?? {};
  const dependencies = { ...(packageJson?.dependencies ?? {}), ...(packageJson?.devDependencies ?? {}) };

  const framework = detectFramework(dependencies, files);
  const packageManager = detectPackageManager(packageJson, files);
  const importantFiles = pickImportantFiles(files, repoTarget.targetPath);
  const importantFileSummaries = await summarizeImportantFiles(workspace, importantFiles);
  const installCommand =
    packageManager === "npm" ? "npm install --no-audit --no-fund --include=dev" : undefined;
  const buildCommand = scripts.build ? "npm run build" : undefined;
  const testCommand = scripts.test && scripts.test !== "echo \"Error: no test specified\" && exit 1" ? "npm run test" : undefined;
  const supportLevel = detectSupportLevel({
    framework,
    packageManager,
    hasPackageJson: Boolean(packageJson),
    hasBuildOrTest: Boolean(buildCommand || testCommand)
  });

  const risks = [
    repoTarget.targetPath ? `Execution will bias toward ${repoTarget.targetPath}.` : "No specific file anchor was supplied.",
    buildCommand ? "A build script is present for verification." : "No build script detected; verification may rely on tests or advisory proof.",
    packageManager === "npm" ? "Cloud Run can use npm directly." : `Detected ${packageManager}, which is outside the v1 execution lane.`
  ];

  return {
    framework,
    packageManager,
    supportLevel,
    supportReason: supportSummary(supportLevel, framework, packageManager, Boolean(buildCommand || testCommand)),
    installCommand,
    buildCommand,
    testCommand,
    importantFiles,
    importantFileSummaries,
    risks,
    rootScripts: Object.keys(scripts),
    targetPathHint: repoTarget.targetPath
  };
}

function detectFramework(dependencies: Record<string, string>, files: string[]) {
  if (dependencies.next) {
    return "Next.js";
  }
  if (dependencies["@remix-run/react"]) {
    return "Remix";
  }
  if (dependencies.astro) {
    return "Astro";
  }
  if (dependencies.react && dependencies.vite) {
    return "React + Vite";
  }
  if (dependencies.react) {
    return "React";
  }
  if (files.some((file) => file.startsWith("src/") && /\.(ts|tsx|js|jsx)$/.test(file))) {
    return "JavaScript or TypeScript web app";
  }
  return "Unknown";
}

function detectPackageManager(packageJson: PackageJsonLike | null, files: string[]) {
  const manager = packageJson?.packageManager?.split("@")[0];
  if (manager) {
    return manager;
  }
  if (files.includes("pnpm-lock.yaml")) {
    return "pnpm";
  }
  if (files.includes("yarn.lock")) {
    return "yarn";
  }
  if (files.includes("bun.lockb") || files.includes("bun.lock")) {
    return "bun";
  }
  if (files.includes("package-lock.json") || files.includes("package.json")) {
    return "npm";
  }
  return "unknown";
}

function pickImportantFiles(files: string[], targetPath?: string) {
  const candidates = [
    targetPath,
    "src/App.tsx",
    "src/App.jsx",
    "src/main.tsx",
    "src/main.jsx",
    "src/index.tsx",
    "src/index.jsx",
    "app/page.tsx",
    "pages/index.tsx",
    "src/styles.css",
    "src/index.css"
  ].filter(Boolean) as string[];

  const important = new Set<string>();
  for (const candidate of candidates) {
    if (files.includes(candidate)) {
      important.add(candidate);
    }
  }

  for (const file of files) {
    if (important.size >= 8) {
      break;
    }
    if (/^(src|app|pages)\/.+\.(tsx|jsx|ts|js|css)$/.test(file)) {
      important.add(file);
    }
  }

  return [...important];
}

async function summarizeImportantFiles(workspace: string, importantFiles: string[]) {
  const summaries: RepoScan["importantFileSummaries"] = [];

  for (const file of importantFiles.slice(0, 6)) {
    const content = await readTextIfExists(path.join(workspace, file));
    if (!content) {
      continue;
    }

    const normalized = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 6)
      .join(" ")
      .replace(/\s+/g, " ")
      .slice(0, 260);

    summaries.push({
      path: file,
      summary: normalized || "Readable file with product-facing code."
    });
  }

  return summaries;
}

function detectSupportLevel(input: {
  framework: string;
  packageManager: string;
  hasPackageJson: boolean;
  hasBuildOrTest: boolean;
}): SupportLevel {
  if (!input.hasPackageJson) {
    return "unsupported";
  }
  if (input.packageManager !== "npm") {
    return "advisory";
  }
  if (input.framework === "Unknown") {
    return "advisory";
  }
  if (!input.hasBuildOrTest) {
    return "advisory";
  }
  return "supported";
}

function supportSummary(level: SupportLevel, framework: string, packageManager: string, hasBuildOrTest: boolean) {
  if (level === "supported") {
    return `Detected ${framework} with ${packageManager} and at least one verification command.`;
  }
  if (level === "advisory") {
    return `Detected ${framework} with ${packageManager}; Cascade can analyze it, but live execution is limited because ${hasBuildOrTest ? "the package manager is outside the v1 lane" : "verification commands are missing"}.`;
  }
  return "Cascade can still analyze the repo, but the current runtime only executes supported JS/TS web repos.";
}
