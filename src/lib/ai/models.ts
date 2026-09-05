import type { AiProviderId } from "@/types/database";

export interface AiModelOption {
  id: string; // model id as sent to provider
  label: string;
  description: string;
  recommended?: boolean;
}

export interface AiProviderOption {
  id: AiProviderId;
  label: string;
  description: string;
  models: AiModelOption[];
  envKey: string; // env var name for api key
  docsUrl?: string;
}

export const AI_PROVIDERS: AiProviderOption[] = [
  {
    id: "openrouter",
    label: "OpenRouter",
    description: "Akses banyak model via satu API (Gemini, GPT, Claude)",
    envKey: "OPENROUTER_API_KEY",
    docsUrl: "https://openrouter.ai/keys",
    models: [
      { id: "inclusionai/ling-3.0-flash-fin:free", label: "Ling 3.0 Flash Fin ★", description: "Fast & free — rekomendasi RT Finance", recommended: true },
      { id: "google/gemini-3.6-flash:free", label: "Gemini 3.6 Flash (free) ★", description: "Google — terbaru, recommended", recommended: false },
      { id: "google/gemini-3.6-flash", label: "Gemini 3.6 Flash", description: "Google — terbaru ★" },
      { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (deprecated)", description: "404 — pakai 3.6" },
      { id: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (deprecated)", description: "Mungkin tidak tersedia" },
      { id: "google/gemini-3.0-flash-preview:free", label: "Gemini 3.0 Flash Preview (free)", description: "Google — terbaru" },
      { id: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash 001 (deprecated)", description: "Deprecated — 404" },
      { id: "google/gemini-2.0-flash-exp:free", label: "Gemini 2.0 Flash Exp (free)", description: "Google — free tier (deprecated)" },
      { id: "google/gemini-2.0-flash:free", label: "Gemini 2.0 Flash (free)", description: "Google — free (deprecated)" },
      { id: "google/gemini-2.0-pro-exp-02-05:free", label: "Gemini 2.0 Pro Exp (free)", description: "Google — free" },
      { id: "google/gemini-1.5-flash", label: "Gemini 1.5 Flash", description: "Google" },
      { id: "google/gemini-1.5-flash-8b", label: "Gemini 1.5 Flash 8B", description: "Google — murah" },
      { id: "google/gemini-1.5-pro", label: "Gemini 1.5 Pro", description: "Google" },
      { id: "google/gemini-pro", label: "Gemini Pro", description: "Google — legacy" },
      { id: "google/gemma-4-31b-it:free", label: "Gemma 4 31B", description: "Free, 262K context" },
      { id: "google/gemma-4-26b-a4b-it:free", label: "Gemma 4 26B A4B", description: "Free, multimodal" },
      { id: "minimax/minimax-m3:free", label: "MiniMax M3", description: "Free, 1M context" },
      { id: "minimax/minimax-m2.7:free", label: "MiniMax M2.7", description: "Free, 196K context" },
      { id: "nvidia/nemotron-3.5-lightning:free", label: "Nemotron 3.5 Lightning", description: "Free, 1M context" },
      { id: "nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron 3 Super", description: "Free, 262K context" },
      { id: "thinkingmachines/inkling:free", label: "Inkling", description: "Free, 1M context" },
      { id: "z-ai/glm-5.2:free", label: "GLM 5.2", description: "Free, 256K context" },
      { id: "openai/gpt-4o-mini", label: "GPT-4o mini", description: "Berbayar, sangat akurat" },
      { id: "anthropic/claude-3.5-haiku", label: "Claude 3.5 Haiku", description: "Berbayar, cepat" },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    description: "Langsung ke OpenAI API",
    envKey: "OPENAI_API_KEY",
    docsUrl: "https://platform.openai.com/api-keys",
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o mini", description: "Rekomendasi", recommended: true },
      { id: "gpt-4o", label: "GPT-4o", description: "Paling akurat" },
      { id: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", description: "Murah" },
    ],
  },
  {
    id: "anthropic",
    label: "Anthropic",
    description: "Claude langsung",
    envKey: "ANTHROPIC_API_KEY",
    docsUrl: "https://console.anthropic.com/settings/keys",
    models: [
      { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku", description: "Cepat", recommended: true },
      { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet", description: "Akurat" },
    ],
  },
  {
    id: "gemini",
    label: "Google Gemini",
    description: "Langsung ke Google AI (Gemini)",
    envKey: "GEMINI_API_KEY",
    docsUrl: "https://aistudio.google.com/app/apikey",
    models: [
      { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash ★", description: "Terbaru — rekomendasi", recommended: true },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash (deprecated)", description: "404 — tidak tersedia, pakai 3.6" },
      { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", description: "Ringan (mungkin deprecated)" },
      { id: "gemini-3.0-flash-preview", label: "Gemini 3.0 Flash Preview", description: "Preview" },
      { id: "gemini-2.0-flash-001", label: "Gemini 2.0 Flash 001 (deprecated)", description: "404 — tidak tersedia" },
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", description: "Stabil (deprecated)" },
      { id: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash Exp", description: "Experimental" },
      { id: "gemini-2.0-pro-exp-02-05", label: "Gemini 2.0 Pro Exp", description: "Pro experimental" },
      { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash", description: "Cepat" },
      { id: "gemini-1.5-flash-8b", label: "Gemini 1.5 Flash 8B", description: "Murah" },
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro", description: "Akurat" },
      { id: "gemini-pro", label: "Gemini Pro", description: "Legacy" },
    ],
  },
  {
    id: "mock",
    label: "Mock (tanpa AI)",
    description: "Hanya heuristic lokal — tanpa biaya, untuk tes",
    envKey: "",
    models: [{ id: "mock", label: "Mock", description: "Tidak pakai LLM" }],
  },
];

export function getProvider(id: AiProviderId): AiProviderOption | undefined {
  return AI_PROVIDERS.find((p) => p.id === id);
}

export function getDefaultModel(provider: AiProviderId): string {
  const p = getProvider(provider);
  return p?.models.find((m) => m.recommended)?.id ?? p?.models[0]?.id ?? "mock";
}

export const DEFAULT_PROVIDER: AiProviderId =
  (process.env.AI_PROVIDER as AiProviderId) ?? "openrouter";
export const DEFAULT_MODEL =
  process.env.OPENROUTER_MODEL ?? "inclusionai/ling-3.0-flash-fin:free";
