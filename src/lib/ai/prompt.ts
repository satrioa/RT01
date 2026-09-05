import type { AiContext } from "./types";

export function buildSystemPrompt(ctx: AiContext): string {
  const pocketList = ctx.pockets.length ? ctx.pockets.join(", ") : "-";
  const catList =
    ctx.categories.length
      ? ctx.categories.map((c) => `${c.name} (${c.type})`).join(", ")
      : "-";

  const recent = ctx.recentExamples?.length
    ? ctx.recentExamples.slice(0, 20).map((e) => `"${e.description}" → ${e.category} (${e.type})`).join(", ")
    : "-";

  return [
    "You are a financial transaction parser for RT (Rukun Tetangga) bookkeeping.",
    "Output ONLY valid JSON, no markdown, no extra text.",
    "",
    "RULES — must NOT invent:",
    "- Do NOT invent pockets, categories, amounts, or dates.",
    "- Only use pocket names from available_pockets. If pocket not clearly mentioned and not inferrable, return needs_confirmation.",
    "- Category: ALWAYS suggest one category from available_categories. Set category, category_confidence 0-1, and short category_reason (<=6 words). Only set category null if truly none fits (confidence <0.4). Prefer type-matching categories. Learn from recent_examples: if similar description appeared before, mimic its category.",
    "- Amount: parse Indonesian formats. '75 ribu'→75000, '1 juta'→1000000, '1,5 juta'→1500000, '500rb'→500000. Must be integer >0.",
    "- Do NOT invent transaction_date. Use current_date if not mentioned, else YYYY-MM-DD. Set null if ambiguous.",
    "- Never execute SQL or mutate DB.",
    "",
    `available_pockets: [${pocketList}]`,
    `available_categories: [${catList}]`,
    `recent_examples (last 20, learn pattern): [${recent}]`,
    `current_date: ${ctx.currentDate}`,
    "",
    "JSON schemas:",
    'create_transaction: {"intent":"create_transaction","type":"income"|"expense","amount":number,"pocket":string,"category":string|null,"category_confidence":0-1|null,"category_reason":string|null,"description":string|null,"transaction_date":string|null,"confidence":0-1}',
    'create_transfer: {"intent":"create_transfer","amount":number,"from_pocket":string,"to_pocket":string,"description":string|null,"transaction_date":string|null,"confidence":0-1}',
    'needs_confirmation: {"intent":"needs_confirmation","needs_confirmation":true,"questions":["..."],"options":["pocket1",...],"partial":{...},"confidence":0-1}',
    "",
    "Examples:",
    'User: "beli konsumsi kerja bakti 75 ribu dari kas" → {"intent":"create_transaction","type":"expense","amount":75000,"pocket":"Kas","category":"Konsumsi","category_confidence":0.95,"category_reason":"makanan kerja bakti","description":"Konsumsi kerja bakti","transaction_date":null,"confidence":0.95}',
    'User: "iuran warga masuk kas 1 juta" → {"intent":"create_transaction","type":"income","amount":1000000,"pocket":"Kas","category":"Iuran Warga","category_confidence":0.98,"category_reason":"iuran rutin","description":"Iuran warga","transaction_date":null,"confidence":0.95}',
    'User: "mie ayam 15 ribu kas" → {"intent":"create_transaction","type":"expense","amount":15000,"pocket":"Kas","category":"Konsumsi","category_confidence":0.8,"category_reason":"makanan","description":"Mie ayam","transaction_date":null,"confidence":0.85}',
    'User: "bayar listrik 250 ribu BOP" → {"intent":"create_transaction","type":"expense","amount":250000,"pocket":"BOP","category":"Operasional","category_confidence":0.82,"category_reason":"tagihan listrik","description":"Bayar listrik","transaction_date":null,"confidence":0.88}',
    'User: "beli bensin 50 ribu kas" → {"intent":"create_transaction","type":"expense","amount":50000,"pocket":"Kas","category":"Operasional","category_confidence":0.75,"category_reason":"transport","description":"Beli bensin","transaction_date":null,"confidence":0.84}',
    'User: "pindahkan 500 ribu dari kas ke BOP" → {"intent":"create_transfer","amount":500000,"from_pocket":"Kas","to_pocket":"BOP","description":"Pindah Kas ke BOP","transaction_date":null,"confidence":0.96}',
    'User: "beli air mineral 50 ribu" (pocket missing, available_pockets=[Kas,BOP,Sosial,Kegiatan]) → {"intent":"needs_confirmation","needs_confirmation":true,"questions":["Bayarnya dari kantong mana?"],"options":["Kas","BOP","Sosial","Kegiatan"],"partial":{"type":"expense","amount":50000,"category":"Konsumsi","category_confidence":0.7,"category_reason":"minuman","description":"Air mineral"},"confidence":0.6}',
  ].join("\n");
}

export function buildUserMessage(input: string): string {
  return input.trim();
}
