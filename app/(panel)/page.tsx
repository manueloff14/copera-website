import { DashboardClient } from "@/components/dashboard-client"
import { fetchServidor } from "@/lib/dashboard-api"
import type { Agregado, Corrida } from "@/lib/dashboard-types"

async function cargarInicial() {
  try {
    const [corridas, agregado] = await Promise.all([
      fetchServidor<Corrida[]>("/api/corridas"),
      fetchServidor<Agregado>("/api/agregado"),
    ])
    return { corridas, agregado }
  } catch {
    return { corridas: [] as Corrida[], agregado: null as Agregado | null }
  }
}

export default async function Page() {
  const { corridas, agregado } = await cargarInicial()

  return (
    <DashboardClient corridasIniciales={corridas} agregadoInicial={agregado} />
  )
}
