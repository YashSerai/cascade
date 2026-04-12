import { describe, expect, it } from "vitest";
import { parseGitHubTarget } from "../server/services/github";

describe("parseGitHubTarget", () => {
  it("parses a repository URL", () => {
    const result = parseGitHubTarget("https://github.com/vercel/satori");
    expect(result.owner).toBe("vercel");
    expect(result.repo).toBe("satori");
    expect(result.targetPath).toBeUndefined();
  });

  it("parses a GitHub blob URL", () => {
    const result = parseGitHubTarget("https://github.com/vercel/satori/blob/main/src/index.ts");
    expect(result.repoUrl).toBe("https://github.com/vercel/satori");
    expect(result.ref).toBe("main");
    expect(result.targetPath).toBe("src/index.ts");
  });
});
