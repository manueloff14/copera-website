import type { Agregado, Corrida, Grupo, WilsonCell } from "./dashboard-types"

// Port de _agregado() de dashboard/servidor.py, para recalcular las tarjetas sobre las corridas
// de un solo modelo. Agrupa igual que el servidor (hash de escena + textos + brazo + etiqueta,
// solo disenos de 6 agentes) para no mezclar versiones del instrumento. Omite el IC por
// bootstrap (primario / descriptivo_union) porque la pagina no lo muestra.

function redondear(x: number): number {
  return Math.round(x * 10_000) / 10_000
}

function wilson(k: number, n: number, z = 1.96): [number, number] {
  const p = k / n
  const d = 1 + (z * z) / n
  const centro = (p + (z * z) / (2 * n)) / d
  const semi = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d
  return [redondear(Math.max(0, centro - semi)), redondear(Math.min(1, centro + semi))]
}

// null si no hay agentes a ese precio (el servidor manda tasa/ic null en ese caso).
function celda(
  corridas: Corrida[],
  precio: number,
  campo: "deposito_clave" | "deposito"
): WilsonCell | null {
  const vals = corridas.flatMap((c) =>
    c.agentes.filter((a) => a.precio_depositar === precio).map((a) => (a[campo] ? 1 : 0))
  )
  const k = vals.reduce((s: number, v) => s + v, 0)
  const n = vals.length
  return n ? { k, n, tasa: redondear(k / n), ic: wilson(k, n) } : null
}

export function agregarCorridas(
  corridas: Corrida[],
  base: Pick<Agregado, "n_preregistrado" | "vigente_hash"> & {
    contabilidad: Pick<Agregado["contabilidad"], "presupuesto">
  }
): Agregado {
  const agrupadas = new Map<string, Corrida[]>()
  for (const c of corridas) {
    if (c.agentes_n !== 6) continue
    const clave = JSON.stringify([c.hash_escena, c.hash_textos, c.brazo, c.etiqueta ?? ""])
    const grupo = agrupadas.get(clave)
    if (grupo) grupo.push(c)
    else agrupadas.set(clave, [c])
  }

  const grupos: Grupo[] = [...agrupadas.values()]
    .sort((a, b) => b.length - a.length)
    .map((grupo) => {
      const primera = grupo[0]
      const fact = grupo.filter((c) => c.brazo === "factorial")
      const clave5 = celda(fact, 5, "deposito_clave")
      const clave20 = celda(fact, 20, "deposito_clave")
      const union5 = celda(fact, 5, "deposito")
      const union20 = celda(fact, 20, "deposito")
      const g: Grupo = {
        hash_escena: primera.hash_escena,
        hash_textos: primera.hash_textos,
        brazo: primera.brazo as Grupo["brazo"],
        etiqueta: primera.etiqueta || null,
        vigente: Boolean(primera.hash_escena && primera.hash_escena === base.vigente_hash),
        corridas: grupo.length,
        agentes: grupo.reduce((s, c) => s + c.agentes_n, 0),
        tokens: grupo.reduce((s, c) => s + (c.tokens ?? 0), 0),
        tarea: {
          ok: grupo.reduce((s, c) => s + c.tarea_ok, 0),
          n: grupo.reduce((s, c) => s + c.agentes_n, 0),
        },
        depositos_clave: grupo.reduce((s, c) => s + c.claves, 0),
        depositos_union: grupo.reduce((s, c) => s + c.union, 0),
      }
      if (clave5 && clave20 && union5 && union20) {
        g.celdas = {
          clave: { precio5: clave5, precio20: clave20 },
          union: { precio5: union5, precio20: union20 },
        }
      }
      return g
    })

  const tokens = corridas.reduce((s, c) => s + (c.tokens ?? 0), 0)
  const presupuesto = base.contabilidad.presupuesto
  return {
    n_preregistrado: base.n_preregistrado,
    vigente_hash: base.vigente_hash,
    grupos,
    contabilidad: {
      tokens,
      presupuesto,
      margen: presupuesto !== null ? presupuesto - tokens : null,
      corridas_totales: corridas.length,
    },
  }
}
