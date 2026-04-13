import { describe, expect, it } from "vitest";
import { coerceModelJsonRoot } from "../server/services/model";

describe("coerceModelJsonRoot", () => {
  it("returns a bare object unchanged", () => {
    const obj = { missionTitle: "x", selectedObjective: "y" };
    expect(coerceModelJsonRoot(obj)).toBe(obj);
  });

  it("unwraps single-element array of object", () => {
    const inner = { a: 1, b: 2 };
    expect(coerceModelJsonRoot([inner])).toEqual(inner);
  });

  it("unwraps nested single-element arrays", () => {
    const inner = { edits: [], approach: "test" };
    expect(coerceModelJsonRoot([[inner]])).toEqual(inner);
  });

  it("picks the object with the most keys when multiple objects are returned", () => {
    const small = { missionTitle: "t" };
    const full = {
      missionTitle: "t",
      selectedObjective: "o",
      rationale: "r",
      confidence: 0.9,
      painPoints: ["a"],
      candidateFeatures: ["b", "c", "d"],
      acceptanceCriteria: ["1", "2", "3"],
      impactedAreas: ["x"],
      implementationBrief: "ib"
    };
    expect(coerceModelJsonRoot([small, full])).toEqual(full);
    expect(coerceModelJsonRoot([full, small])).toEqual(full);
  });

  it("drills through array-of-array when inner holds the object", () => {
    const inner = { foo: "bar" };
    expect(coerceModelJsonRoot([[[inner]]])).toEqual(inner);
  });
});
