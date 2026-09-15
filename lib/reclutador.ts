import type { Corrida } from "./dashboard-types"

// Formas de reportes/reclutador.json (analisis/reclutador.py) y reportes/reclutador-texto.json
// (analisis/reclutador_texto.py), servidos por /api/reporte/<arch> de dashboard/servidor.py.

export interface CeldaReclutador {
  corridas: number
  agentes: number
  entregaron: number
  tasa: number
  ic95_por_corrida: [number, number]
  tasas_por_corrida: number[]
}

export interface BrazoReclutador {
  familia: string
  corridas_validas: number
  excluidas: number
  hash_escena: string
  celdas: { "5": CeldaReclutador; "20": CeldaReclutador }
  tareas_completadas: number
  detalle_excluidas: unknown[]
}

export interface ContrasteReclutador {
  media: number
  ic95: [number, number] | null
  incluye_cero: boolean | null
  insuficiente?: string
}

export interface ReporteReclutador {
  brazos: Record<string, BrazoReclutador>
  contrastes: Record<string, ContrasteReclutador>
  notas: string[]
  base_referencia: {
    fuente: string
    corridas: number
    tasas: { "5": number; "20": number }
    unidades: string
    sin_intervalo_conjunto: string
  }
}

export interface CategoriaTexto {
  agentes: number
  pct: number
  de_ellos_entregaron: number
}

export interface BrazoTexto {
  agentes: number
  categorias: Record<string, CategoriaTexto>
  ejemplos: Record<string, string>
  sin_ninguna_categoria: { agentes: number; pct: number }
  entregaron: number
}

export interface ReporteReclutadorTexto {
  patrones: Record<string, string>
  limites: string[]
  brazos: Record<string, BrazoTexto>
}

// Las cuatro familias del reclutador (docs/revision/reclutador-analisis.md). Solo las dos
// primeras entran en reclutador.json; las de reserva se analizan en tomar-3x2.json.
export const FAMILIAS_RECLUTADOR = [
  {
    familia: "factorial-reclutador",
    brazo: "R1a tercero",
    descripcion: "Pide por «la estación 4» (tercero de fuera)",
  },
  {
    familia: "factorial-reclutador-par-arbol2",
    brazo: "R1c par",
    descripcion: "Pide por un par del grupo (compañero nombrado)",
  },
  {
    familia: "factorial-reclutador-abstencion-arbol2",
    brazo: "R1a + reserva, K=5",
    descripcion: "Tercero neutral con la reserva activa, precio 5",
  },
  {
    familia: "factorial-reclutador-abstencion-caro-arbol2",
    brazo: "R1a + reserva, K=20",
    descripcion: "Tercero neutral con la reserva activa, precio 20",
  },
] as const

// Claves de reclutador.json -> brazo legible.
export const ETIQUETA_BRAZO: Record<string, { brazo: string; descripcion: string }> = {
  tercero: { brazo: "R1a tercero", descripcion: FAMILIAS_RECLUTADOR[0].descripcion },
  par: { brazo: "R1c par", descripcion: FAMILIAS_RECLUTADOR[1].descripcion },
}

// "20260913T223934_factorial-reclutador" -> "factorial-reclutador".
export function familiaDe(c: Corrida): string {
  return c.nombre.replace(/^\d{8}T\d{6}_/, "")
}

const FAMILIAS = new Set<string>(FAMILIAS_RECLUTADOR.map((f) => f.familia))

export function esCorridaReclutador(c: Corrida): boolean {
  return FAMILIAS.has(familiaDe(c))
}
