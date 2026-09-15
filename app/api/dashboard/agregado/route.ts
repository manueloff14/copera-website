import { fetchServidor } from "@/lib/dashboard-api"
import type { Agregado } from "@/lib/dashboard-types"

export async function GET() {
  try {
    const agregado = await fetchServidor<Agregado>("/api/agregado")
    return Response.json(agregado)
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "error desconocido" },
      { status: 502 }
    )
  }
}
