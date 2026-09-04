import type { AiProvider } from "./provider";
import type { AiContext, AiParsedResult } from "./types";
import { ProviderNotConfiguredError } from "./provider";
import { buildSystemPrompt, buildUserMessage } from "./prompt";
import { z } from "zod";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export class OpenRouterProvider implements AiProvider {
  name = "openrouter";
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey ?? process.env.OPENROUTER_API_KEY ?? "";
    this.model = model ?? process.env.OPENROUTER_MODEL ?? "google/gemini-2.0-flash-001";
  }

  async parse(userMessage: string, context: AiContext): Promise<AiParsedResult> {
    if (!this.apiKey) {
      throw new ProviderNotConfiguredError("OPENROUTER_API_KEY belum dikonfigurasi");
    }

    const system = buildSystemPrompt(context);
    const user = buildUserMessage(userMessage);

    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        "X-Title": "RT Finance",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 400,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`OpenRouter error ${res.status}: ${txt.slice(0, 400)}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenRouter: empty content");

    // Strip markdown fence if present
    const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error(`AI returned invalid JSON: ${cleaned.slice(0, 300)}`);
    }

    // Minimal Zod validation — allow loose then refine in parser.ts
    const loose = z
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
      .passthrough()
      .parse(parsed);

    return loose as unknown as AiParsedResult;
  }
}
