import { describe, expect, it } from "vitest";
import { FALLBACK_MODEL, PRIMARY_MODEL, createEmptyModelSelection, resolveApiKey } from "../server/services/model";

describe("model selection", () => {
  it("prefers user keys over server keys", () => {
    process.env.GEMINI_API_KEY = "server-key";
    const result = resolveApiKey("user-key");
    expect(result.apiKey).toBe("user-key");
    expect(result.keyMode).toBe("user");
  });

  it("builds the documented default model policy", () => {
    const selection = createEmptyModelSelection("none", "none");
    expect(selection.requestedModel).toBe(PRIMARY_MODEL);
    expect(selection.fallbackModel).toBe(FALLBACK_MODEL);
    expect(selection.fallbackUsed).toBe(false);
  });
});
