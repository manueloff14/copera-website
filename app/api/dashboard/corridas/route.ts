import { fetchServidor } from "@/lib/dashboard-api"
import type { Corrida } from "@/lib/dashboard-types"

export async function GET() {
  try {
    const corridas = await fetchServidor<Corrida[]>("/api/corridas")
    return Response.json(corridas)
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "error desconocido" },
      { status: 502 }
    )
  }
}
