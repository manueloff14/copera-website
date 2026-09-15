import { fetchServidor } from "@/lib/dashboard-api"

// Solo nombres planos de reportes .json (p. ej. "reclutador.json"); servidor.py ademas toma el
// basename y exige que el archivo viva en reportes/.
const NOMBRE_VALIDO = /^[\w-][\w.-]*\.json$/

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ arch: string }> }
) {
  const { arch } = await params
  if (!NOMBRE_VALIDO.test(arch)) {
    return Response.json({ error: "nombre de reporte invalido" }, { status: 400 })
  }

  try {
    const reporte = await fetchServidor<unknown>(
      `/api/reporte/${encodeURIComponent(arch)}`
    )
    return Response.json(reporte)
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "error desconocido" },
      { status: 502 }
    )
  }
}
