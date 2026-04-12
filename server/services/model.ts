import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type { KeyMode, ModelSelection } from "../../shared/types";

export const PRIMARY_MODEL = "gemini-3.1-pro-preview";
export const FALLBACK_MODEL = "gemini-3-pro-preview";
export const SAFETY_MODEL = "gemini-2.5-pro";

export function resolveApiKey(providedApiKey?: string) {
  const userKey = providedApiKey?.trim();
  if (userKey) {
    return { apiKey: userKey, keyMode: "user" as KeyMode };
  }

  const envKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
  if (envKey) {
    return { apiKey: envKey, keyMode: "server" as KeyMode };
  }

  return { apiKey: "", keyMode: "none" as KeyMode };
}

export function createEmptyModelSelection(keyMode: KeyMode): ModelSelection {
  return {
    requestedModel: PRIMARY_MODEL,
    fallbackModel: FALLBACK_MODEL,
    attemptedModels: [],
    fallbackUsed: false,
    keyMode
  };
}

export async function generateStructuredJson<T>(input: {
  apiKey: string;
  keyMode: KeyMode;
  schema: z.ZodSchema<T>;
  responseSchema: Record<string, unknown>;
  systemInstruction: string;
  prompt: string;
}) {
  const attemptedModels: string[] = [];
  const ai = new GoogleGenAI({ apiKey: input.apiKey });
  let lastError: unknown;

  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL, SAFETY_MODEL]) {
    attemptedModels.push(model);
    try {
      const response = await ai.models.generateContent({
        model,
        contents: input.prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: input.responseSchema,
          systemInstruction: input.systemInstruction,
          temperature: 0.4
        }
      });

      const raw = extractJson(response.text ?? "");
      const parsed = input.schema.parse(JSON.parse(raw));

      return {
        data: parsed,
        modelSelection: {
          requestedModel: PRIMARY_MODEL,
          fallbackModel: FALLBACK_MODEL,
          attemptedModels,
          activeModel: model,
          fallbackUsed: model !== PRIMARY_MODEL,
          keyMode: input.keyMode
        } satisfies ModelSelection
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Gemini failed to return a valid response.");
}

function extractJson(raw: string) {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return trimmed;
  }

  const fenced = trimmed.match(/```json\s*([\s\S]*?)```/i) ?? trimmed.match(/```([\s\S]*?)```/);
  return fenced?.[1]?.trim() ?? trimmed;
}
