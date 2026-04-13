import { describe, expect, it } from "vitest";
import { normalizePlanPayload } from "../server/services/execution/localGeminiProvider";

describe("normalizePlanPayload", () => {
  it("unwraps plan nested object", () => {
    const inner = {
      approach: "a",
      targetFiles: ["src/App.tsx"],
      verificationStrategy: ["build"],
      notes: ["n"],
      edits: [{ path: "src/App.tsx", summary: "s", content: "c" }]
    };
    expect(normalizePlanPayload({ plan: inner })).toEqual(inner);
  });

  it("prefers array element that has edits", () => {
    const meta = { status: "ok", version: 1, trace: "x" };
    const real = {
      approach: "fix",
      targetFiles: ["a.tsx"],
      verificationStrategy: ["npm run build"],
      notes: [],
      edits: [{ path: "a.tsx", summary: "s", content: "x" }]
    };
    expect(normalizePlanPayload([meta, real])).toEqual(real);
  });

  it("maps snake_case target_files", () => {
    const o = {
      approach: "a",
      target_files: ["b.tsx"],
      verification_strategy: ["test"],
      notes: [],
      edits: [{ path: "b.tsx", summary: "s", content: "c" }]
    };
    const out = normalizePlanPayload(o) as Record<string, unknown>;
    expect(out.targetFiles).toEqual(["b.tsx"]);
    expect(out.verificationStrategy).toEqual(["test"]);
  });

  it("coerces verificationStrategy and notes from a single string", () => {
    const o = {
      approach: "fix",
      targetFiles: ["a.tsx"],
      verificationStrategy: "npm run build",
      notes: "single note line",
      edits: [{ path: "a.tsx", summary: "s", content: "x" }]
    };
    const out = normalizePlanPayload(o) as Record<string, unknown>;
    expect(out.verificationStrategy).toEqual(["npm run build"]);
    expect(out.notes).toEqual(["single note line"]);
  });

  it("maps alternate edit keys (file, body)", () => {
    const o = {
      approach: "a",
      targetFiles: ["x.tsx"],
      verificationStrategy: ["build"],
      notes: [],
      edits: [{ file: "x.tsx", body: "export {}" }]
    };
    const out = normalizePlanPayload(o) as Record<string, unknown>;
    expect(out.edits).toEqual([
      expect.objectContaining({ path: "x.tsx", content: "export {}", summary: expect.any(String) })
    ]);
  });
});
