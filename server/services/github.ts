import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { RepoTarget } from "../../shared/types";

const execFileAsync = promisify(execFile);

function isMissingGitBinary(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ENOENT"
  );
}

export function parseGitHubTarget(inputUrl: string): RepoTarget {
  let url: URL;

  try {
    url = new URL(inputUrl);
  } catch {
    throw new Error("Please provide a valid GitHub repository or file URL.");
  }

  if (url.hostname !== "github.com") {
    throw new Error("Cascade currently supports public GitHub URLs only.");
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    throw new Error("GitHub URL must include an owner and repository.");
  }

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/, "");
  const repoUrl = `https://github.com/${owner}/${repo}`;

  let ref: string | undefined;
  let targetPath: string | undefined;

  if (segments[2] === "blob" || segments[2] === "tree") {
    ref = segments[3];
    targetPath = segments.slice(4).join("/");
  }

  return {
    inputUrl,
    repoUrl,
    owner,
    repo,
    cloneUrl: `${repoUrl}.git`,
    ref,
    targetPath: targetPath || undefined
  };
}

export async function cloneRepository(repoTarget: RepoTarget) {
  const baseDir = path.join(os.tmpdir(), "cascade");
  const workspace = path.join(baseDir, `${repoTarget.owner}-${repoTarget.repo}-${Date.now()}`);

  await fs.mkdir(baseDir, { recursive: true });

  const args = ["clone", "--depth", "1"];
  if (repoTarget.ref) {
    args.push("--branch", repoTarget.ref);
  }
  args.push(repoTarget.cloneUrl, workspace);

  try {
    await execFileAsync("git", args, { timeout: 120000 });
  } catch (error) {
    await safeRemove(workspace);
    if (isMissingGitBinary(error)) {
      throw new Error("Hosted runtime is missing the git executable, so repository cloning cannot start.");
    }
    const message = error instanceof Error ? error.message : "Git clone failed.";
    throw new Error(`Unable to clone the repository. Confirm the repo is public and reachable. ${message}`);
  }

  return workspace;
}

export async function safeRemove(targetPath: string) {
  try {
    await fs.rm(targetPath, { recursive: true, force: true });
  } catch {
    // ignore
  }
}
