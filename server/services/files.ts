import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ignoredDirectories = new Set([".git", "node_modules", "dist", "build", ".next", ".turbo", "coverage"]);

export async function listRepoFiles(root: string, current = "", found: string[] = []) {
  if (found.length >= 250) {
    return found;
  }

  const directory = path.join(root, current);
  const entries = await fs.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".github" && entry.name !== ".env.example") {
      continue;
    }

    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) {
        continue;
      }
      await listRepoFiles(root, path.join(current, entry.name), found);
    } else if (entry.isFile()) {
      found.push(path.join(current, entry.name).replace(/\\/g, "/"));
    }

    if (found.length >= 250) {
      break;
    }
  }

  return found;
}

export async function readJsonIfExists<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function readTextIfExists(filePath: string) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

export function normalizePathForWorkspace(workspace: string, relativePath: string) {
  const resolved = path.resolve(workspace, relativePath);
  const normalizedWorkspace = path.resolve(workspace);

  if (!resolved.startsWith(normalizedWorkspace)) {
    throw new Error(`Refusing to write outside the mission workspace: ${relativePath}`);
  }

  return resolved;
}

export async function writeFileSafe(workspace: string, relativePath: string, content: string) {
  const destination = normalizePathForWorkspace(workspace, relativePath);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, content, "utf8");
}

export function getNpmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

export async function runCommand(command: string, args: string[], cwd: string, timeout = 300000) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, { cwd, timeout, maxBuffer: 1024 * 1024 * 8 });
    return { ok: true, stdout, stderr };
  } catch (error) {
    const stdout = typeof error === "object" && error && "stdout" in error ? String((error as { stdout?: string }).stdout ?? "") : "";
    const stderr = typeof error === "object" && error && "stderr" in error ? String((error as { stderr?: string }).stderr ?? "") : "";
    const message = error instanceof Error ? error.message : "Command failed.";
    return { ok: false, stdout, stderr, message };
  }
}

export function trimOutput(output: string, limit = 4000) {
  return output.length > limit ? `${output.slice(0, limit)}\n\n...[truncated]` : output;
}
