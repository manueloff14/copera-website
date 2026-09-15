// Cliente servidor-a-servidor para dashboard/servidor.py.
//
// servidor.py no manda cabeceras CORS, asi que el navegador nunca debe
// llamarlo directo desde otro origen: solo Route Handlers y Server
// Components de este mismo proyecto (via fetchServidor) lo consultan, y el
// navegador solo habla con las rutas /api/dashboard/* de este mismo origen.

const BASE_URL = (
  process.env.DASHBOARD_API_URL ?? "http://127.0.0.1:8890"
).replace(/\/+$/, "")

export async function fetchServidor<T>(ruta: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${ruta}`, {
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error(`servidor.py ${ruta} respondio ${res.status}`)
  }

  return (await res.json()) as T
}
