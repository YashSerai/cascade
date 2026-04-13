import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type { KeyMode, ModelProvider, ModelSelection } from "../../shared/types";

export const PRIMARY_MODEL = "gemini-2.5-pro";
export const FALLBACK_MODEL = "gemini-2.5-flash";
export const SAFETY_MODEL = "gemini-2.5-flash";

export function resolveApiKey(providedApiKey?: string) {
  const userKey = providedApiKey?.trim();
  if (userKey) {
    return {
      apiKey: userKey,
      keyMode: "user" as KeyMode,
      provider: "gemini-developer" as ModelProvider,
      clientOptions: {
        apiKey: userKey
      }
    };
  }

  const vertexKey =
    process.env.VERTEX_API_KEY?.trim() ||
    process.env.VERTEX_AI_API_KEY?.trim() ||
    process.env.GEMINI_VERTEX_API_KEY?.trim();
  if (vertexKey) {
    return {
      apiKey: vertexKey,
      keyMode: "server" as KeyMode,
      provider: "vertex-ai" as ModelProvider,
      clientOptions: {}
    };
  }

  const envKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
  if (envKey) {
    return {
      apiKey: envKey,
      keyMode: "server" as KeyMode,
      provider: "gemini-developer" as ModelProvider,
      clientOptions: {
        apiKey: envKey
      }
    };
  }

  return {
    apiKey: "",
    keyMode: "none" as KeyMode,
    provider: "none" as ModelProvider,
    clientOptions: {}
  };
}

export function createEmptyModelSelection(keyMode: KeyMode, provider: ModelProvider): ModelSelection {
  return {
    requestedModel: PRIMARY_MODEL,
    fallbackModel: FALLBACK_MODEL,
    attemptedModels: [],
    fallbackUsed: false,
    keyMode,
    provider
  };
}

export async function generateStructuredJson<T>(input: {
  apiKey: string;
  keyMode: KeyMode;
  provider: ModelProvider;
  clientOptions: ConstructorParameters<typeof GoogleGenAI>[0];
  schema: z.ZodSchema<T>;
  responseSchema: Record<string, unknown>;
  systemInstruction: string;
  prompt: string;
}) {
  if (input.provider === "vertex-ai") {
    return generateStructuredJsonViaVertexApi(input);
  }

  const attemptedModels: string[] = [];
  const ai = new GoogleGenAI(input.clientOptions);
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
          keyMode: input.keyMode,
          provider: input.provider
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

async function generateStructuredJsonViaVertexApi<T>(input: {
  apiKey: string;
  keyMode: KeyMode;
  provider: ModelProvider;
  schema: z.ZodSchema<T>;
  responseSchema: Record<string, unknown>;
  systemInstruction: string;
  prompt: string;
}) {
  const attemptedModels: string[] = [];
  let lastError: unknown;

  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL, SAFETY_MODEL]) {
    attemptedModels.push(model);
    try {
      const response = await fetch(buildVertexModelUrl(model, input.apiKey), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: input.prompt }]
            }
          ],
          systemInstruction: {
            role: "system",
            parts: [{ text: input.systemInstruction }]
          },
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.4
          }
        })
      });

      if (!response.ok) {
        throw new Error(await extractVertexError(response));
      }

      const payload = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              text?: string;
            }>;
          };
        }>;
      };
      const rawText =
        payload.candidates
          ?.flatMap((candidate) => candidate.content?.parts ?? [])
          .map((part) => part.text ?? "")
          .join("\n")
          .trim() ?? "";

      const raw = extractJson(rawText);
      const parsed = input.schema.parse(JSON.parse(raw));

      return {
        data: parsed,
        modelSelection: {
          requestedModel: PRIMARY_MODEL,
          fallbackModel: FALLBACK_MODEL,
          attemptedModels,
          activeModel: model,
          fallbackUsed: model !== PRIMARY_MODEL,
          keyMode: input.keyMode,
          provider: input.provider
        } satisfies ModelSelection
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Vertex AI failed to return a valid response.");
}

function buildVertexModelUrl(model: string, apiKey: string) {
  const apiVersion = process.env.GOOGLE_GENAI_API_VERSION?.trim() || "v1";
  const endpoint = process.env.VERTEX_API_ENDPOINT?.trim() || "https://aiplatform.googleapis.com";
  return `${endpoint}/${apiVersion}/publishers/google/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
}

async function extractVertexError(response: Response) {
  const fallback = `Vertex AI request failed with status ${response.status}.`;

  try {
    const payload = (await response.json()) as {
      error?: {
        message?: string;
      };
    };
    return payload.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}
