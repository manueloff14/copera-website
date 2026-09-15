import type { Corrida } from "./dashboard-types"

// Solo cuentan como modelo seleccionable los que tienen al menos 6 corridas: por debajo son
// intentos cortados por tiempo (ver docs/investigacion.md, seccion D), no un brazo real.
export const MIN_CORRIDAS_MODELO = 6

export const MODELO_DESCONOCIDO = "desconocido"

// Corridas de salidas-generalizacion/ cuyo resumen.json no trae "modelo" en la copia del
// servidor. El modelo sale de la etiqueta del lote que las corrio
// (salidas-generalizacion/lote_generalizacion-<familia>_*.json). Solo se usa si el servidor
// manda null: cuando el resumen traiga su modelo, manda el servidor.
const MODELO_POR_LOTE: Record<string, string> = {
  "generalizacion/20260914T012654_factorial-base": "openrouter/google/gemini-3.1-flash-lite",
  "generalizacion/20260914T012946_factorial-base": "openrouter/google/gemini-3.1-flash-lite",
  "generalizacion/20260914T013136_factorial-base": "openrouter/google/gemini-3.1-flash-lite",
  "generalizacion/20260914T013349_factorial-base": "openrouter/google/gemini-3.1-flash-lite",
  "generalizacion/20260914T013612_factorial-base": "openrouter/google/gemini-3.1-flash-lite",
  "generalizacion/20260914T013747_factorial-base": "openrouter/google/gemini-3.1-flash-lite",
  "generalizacion/20260914T023519_factorial-base": "openrouter/anthropic/claude-haiku-4.5",
  "generalizacion/20260914T024747_factorial-base": "openrouter/anthropic/claude-haiku-4.5",
  "generalizacion/20260914T024936_factorial-base": "openrouter/anthropic/claude-haiku-4.5",
  "generalizacion/20260914T025222_factorial-base": "openrouter/anthropic/claude-haiku-4.5",
  "generalizacion/20260914T025441_factorial-base": "openrouter/anthropic/claude-haiku-4.5",
  "generalizacion/20260914T025640_factorial-base": "openrouter/anthropic/claude-haiku-4.5",
  "generalizacion/20260914T030630_factorial-base": "openrouter/mistralai/mistral-small-2603",
  "generalizacion/20260914T030813_factorial-base": "openrouter/mistralai/mistral-small-2603",
  "generalizacion/20260914T030951_factorial-base": "openrouter/mistralai/mistral-small-2603",
  "generalizacion/20260914T031128_factorial-base": "openrouter/mistralai/mistral-small-2603",
  "generalizacion/20260914T031249_factorial-base": "openrouter/mistralai/mistral-small-2603",
  "generalizacion/20260914T031421_factorial-base": "openrouter/mistralai/mistral-small-2603",
  "generalizacion/20260914T032640_factorial-base": "openrouter/x-ai/grok-4.3",
  "generalizacion/20260914T034019_factorial-base": "openrouter/cohere/command-r-08-2024",
}

export function modeloDe(c: Corrida): string {
  return c.modelo ?? MODELO_POR_LOTE[c.corrida] ?? MODELO_DESCONOCIDO
}

// "openrouter/google/gemini-3.1-flash-lite" -> "gemini-3.1-flash-lite"; el primario
// ("glm-5.3-flash") ya viene corto.
export function etiquetaModelo(modelo: string): string {
  const partes = modelo.split("/")
  return partes[partes.length - 1]
}

// Icono a color de la empresa de cada modelo (public/logos/, de @lobehub/icons-static-svg).
const LOGO_POR_EMPRESA: [RegExp, string][] = [
  [/glm|zhipu|z-ai/i, "/logos/zhipu-color.svg"],
  [/gemini|google/i, "/logos/google-color.svg"],
  [/claude|anthropic/i, "/logos/claude-color.svg"],
  [/mistral/i, "/logos/mistral-color.svg"],
  [/gpt|openai/i, "/logos/openai.svg"],
  [/deepseek/i, "/logos/deepseek-color.svg"],
  [/grok|x-ai/i, "/logos/xai.svg"],
  [/cohere|command-r/i, "/logos/cohere-color.svg"],
]

export function logoModelo(modelo: string): string | null {
  return LOGO_POR_EMPRESA.find(([patron]) => patron.test(modelo))?.[1] ?? null
}

export function modelosSeleccionables(corridas: Corrida[]): [string, number][] {
  const conteo = new Map<string, number>()
  for (const c of corridas) {
    const m = modeloDe(c)
    conteo.set(m, (conteo.get(m) ?? 0) + 1)
  }
  return [...conteo.entries()]
    .filter(([, n]) => n >= MIN_CORRIDAS_MODELO)
    .sort((a, b) => b[1] - a[1])
}
