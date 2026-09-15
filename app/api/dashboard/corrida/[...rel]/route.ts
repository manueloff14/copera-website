import { fetchServidor } from "@/lib/dashboard-api"
import type { CorridaDetalle } from "@/lib/dashboard-types"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ rel: string[] }> }
) {
  const { rel } = await params
  const ruta = rel.map(encodeURIComponent).join("/")

  try {
    const detalle = await fetchServidor<CorridaDetalle>(`/api/corrida/${ruta}`)
    return Response.json(detalle)
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "error desconocido" },
      { status: 502 }
    )
  }
}
