// Formas de las respuestas de dashboard/servidor.py (ver su docstring para la tabla de rutas).

export interface Deposito {
  agente: string
  ronda: number
  via: string | null
  texto: string
}

export interface Agente {
  id: string
  entregado: string
  tarea_correcta: boolean
  pasos_restantes: number
  gastado: number
  puntaje: number
  precio_depositar?: number
  deposito?: boolean
  deposito_clave?: boolean
}

export interface Corrida {
  corrida: string
  nombre: string
  etiqueta: string | null
  brazo: string
  modelo: string | null
  tokens: number
  rondas: number
  eventos: number
  hash_escena: string
  hash_textos: string
  ultimo_hash: string
  agentes_n: number
  tarea_ok: number
  claves: number
  union: number
  depositos: Deposito[]
  agentes: Agente[]
}

export interface WilsonCell {
  k: number
  n: number
  tasa: number
  ic: [number, number]
}

export interface Contraste {
  por_corrida: number[]
  media: number
  ic_bootstrap: [number, number]
  favor_barato: number
  empates: number
  favor_caro: number
}

export interface Grupo {
  hash_escena: string
  hash_textos: string
  brazo: "factorial" | "costo-cero"
  etiqueta: string | null
  vigente: boolean
  corridas: number
  agentes: number
  tokens: number
  tarea: { ok: number; n: number }
  depositos_clave: number
  depositos_union: number
  primario?: Contraste
  descriptivo_union?: Contraste
  celdas?: {
    clave: { precio5: WilsonCell; precio20: WilsonCell }
    union: { precio5: WilsonCell; precio20: WilsonCell }
  }
  h4_costo_cero?: {
    clave: WilsonCell
    union: WilsonCell
    nota: string
  }
  cap_agotado?: unknown
}

export interface Evento {
  agente: string | null
  costo: number
  detalle: string
  prev: string
  ronda: number
  seq: number
  t: number
  tipo: string
  hash: string
}

export interface CorridaDetalle {
  corrida: string
  agentes: Agente[]
  eventos: Evento[]
  indicadores: {
    eventos: number
    rechazos: number
    depositos_herr: number
    depositos_http: number
    depositos_clave: number
    tarea_ok: number
    agentes_n: number
    doble_cobro: { agente: string; texto: string }[]
    cap_agotado: string[]
    tarea_ok_sin_cap: number
  }
}

export interface Agregado {
  n_preregistrado: number
  vigente_hash: string
  grupos: Grupo[]
  contabilidad: {
    tokens: number
    presupuesto: number | null
    margen: number | null
    corridas_totales: number
  }
}
