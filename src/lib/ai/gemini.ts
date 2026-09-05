import { GoogleGenAI } from "@google/genai";
import type { AiProvider } from "./provider";
import type { AiContext, AiParsedResult } from "./types";
import { ProviderNotConfiguredError } from "./provider";
import { buildSystemPrompt, buildUserMessage } from "./prompt";
import { z } from "zod";

const looseResultSchema = z
  .object({
    intent: z.string(),
    amount: z.number().optional(),
    pocket: z.string().optional(),
    from_pocket: z.string().optional(),
    to_pocket: z.string().optional(),
    type: z.string().optional(),
    needs_confirmation: z.boolean().optional(),
    questions: z.array(z.string()).optional(),
  })
  .passthrough();

export class GeminiProvider implements AiProvider {
  name = "gemini";

  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey =
      apiKey ??
      process.env.GEMINI_API_KEY ??
      process.env.GOOGLE_API_KEY ??
      "";

    const rawModel = model ?? process.env.GEMINI_MODEL ?? "gemini-3.6-flash";
    // auto-migrate deprecated models (404) → latest
    const deprecatedMap: Record<string, string> = {
      "gemini-2.5-flash": "gemini-3.6-flash",
      "gemini-2.5-flash-lite": "gemini-3.6-flash",
      "models/gemini-2.5-flash": "gemini-3.6-flash",
      "google/gemini-2.5-flash": "gemini-3.6-flash",
      "google/gemini-2.5-flash-lite": "gemini-3.6-flash",
      "gemini-2.0-flash-001": "gemini-3.6-flash",
      "gemini-2.0-flash": "gemini-3.6-flash",
      "google/gemini-2.0-flash-001": "gemini-3.6-flash",
      "google/gemini-2.0-flash": "gemini-3.6-flash",
      "models/gemini-2.0-flash-001": "gemini-3.6-flash",
      "models/gemini-2.0-flash": "gemini-3.6-flash",
    };
    this.model = deprecatedMap[rawModel] ?? rawModel;
  }

  async parse(
    userMessage: string,
    context: AiContext
  ): Promise<AiParsedResult> {
    if (!this.apiKey) {
      throw new ProviderNotConfiguredError(
        "GEMINI_API_KEY belum dikonfigurasi"
      );
    }

    const ai = new GoogleGenAI({
      apiKey: this.apiKey,
    });

    const system = buildSystemPrompt(context);
    const user = buildUserMessage(userMessage);

    const response = await ai.models.generateContent({
      model: this.model,
      contents: `${system}\n\n${user}`,
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
        maxOutputTokens: 400,
      },
    });

    const content = response.text;

    if (!content) {
      throw new Error("Gemini: empty content");
    }

    const cleaned = content
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: unknown;

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error(
        `AI returned invalid JSON: ${cleaned.slice(0, 300)}`
      );
    }

    const loose = looseResultSchema.parse(parsed);

    return loose as unknown as AiParsedResult;
  }
}
