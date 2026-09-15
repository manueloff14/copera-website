import { fetchServidor } from "@/lib/dashboard-api"

export async function GET() {
  try {
    const estado = await fetchServidor<unknown>("/api/estado")
    return Response.json(estado)
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "error desconocido" },
      { status: 502 }
    )
  }
}
