import { ReclutadoresClient } from "@/components/reclutadores-client"
import { fetchServidor } from "@/lib/dashboard-api"
import type { Corrida } from "@/lib/dashboard-types"
import type { ReporteReclutador, ReporteReclutadorTexto } from "@/lib/reclutador"

// Cada fuente falla por separado: sin reclutador-texto.json la pagina igual muestra las tasas.
async function cargarInicial() {
  const [reporte, texto, corridas] = await Promise.all([
    fetchServidor<ReporteReclutador>("/api/reporte/reclutador.json").catch(() => null),
    fetchServidor<ReporteReclutadorTexto>("/api/reporte/reclutador-texto.json").catch(
      () => null
    ),
    fetchServidor<Corrida[]>("/api/corridas").catch(() => [] as Corrida[]),
  ])
  return { reporte, texto, corridas }
}

export default async function Page() {
  const { reporte, texto, corridas } = await cargarInicial()

  return (
    <ReclutadoresClient
      reporteInicial={reporte}
      textoInicial={texto}
      corridasIniciales={corridas}
    />
  )
}
