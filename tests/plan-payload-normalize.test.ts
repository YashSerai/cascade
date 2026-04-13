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
});
