import type { AiContext, AiParsedResult } from "./types";

/**
 * Provider abstraction — OpenRouter can be replaced with any LLM provider.
 */
export interface AiProvider {
  name: string;
  parse(userMessage: string, context: AiContext): Promise<AiParsedResult>;
}

export class ProviderNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderNotConfiguredError";
  }
}
