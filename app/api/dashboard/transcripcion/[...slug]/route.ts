import { fetchServidor } from "@/lib/dashboard-api"

// slug = [...partes de rel, agente]; rel puede tener sub-carpetas, agente es
// siempre el ultimo segmento (ver dashboard/servidor.py, _transcripcion()).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
  if (slug.length < 2) {
    return Response.json({ error: "falta corrida o agente" }, { status: 400 })
  }
  const agente = slug[slug.length - 1]
  const rel = slug.slice(0, -1).map(encodeURIComponent).join("/")

  try {
    const transcripcion = await fetchServidor<unknown>(
      `/api/transcripcion/${rel}/${encodeURIComponent(agente)}`
    )
    return Response.json(transcripcion)
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "error desconocido" },
      { status: 502 }
    )
  }
}
