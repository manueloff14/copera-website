"use client"

import * as React from "react"

interface EstadoPolling<T> {
  data: T | null
  error: string | null
  cargando: boolean
  actualizadoEn: Date | null
}

// Sondea `url` cada `intervaloMs` contra las rutas /api/dashboard/* (mismo
// origen, sin problema de CORS) para que la pantalla se mantenga
// actualizada sin recargar. Si una vuelta falla, conserva el ultimo dato
// bueno y solo expone el error.
export function usePollingJson<T>(
  url: string,
  intervaloMs: number,
  datoInicial: T | null = null
): EstadoPolling<T> {
  const [estado, setEstado] = React.useState<EstadoPolling<T>>({
    data: datoInicial,
    error: null,
    cargando: datoInicial === null,
    actualizadoEn: datoInicial ? new Date() : null,
  })

  React.useEffect(() => {
    let cancelado = false

    async function cargar() {
      try {
        const res = await fetch(url, { cache: "no-store" })
        const cuerpo = (await res.json()) as T | { error: string }
        if (!res.ok) {
          const mensaje =
            cuerpo && typeof cuerpo === "object" && "error" in cuerpo
              ? String((cuerpo as { error: unknown }).error)
              : `${url} respondio ${res.status}`
          throw new Error(mensaje)
        }
        if (!cancelado) {
          setEstado({
            data: cuerpo as T,
            error: null,
            cargando: false,
            actualizadoEn: new Date(),
          })
        }
      } catch (error) {
        if (!cancelado) {
          setEstado((previo) => ({
            ...previo,
            error: error instanceof Error ? error.message : "error desconocido",
            cargando: false,
          }))
        }
      }
    }

    cargar()
    const id = setInterval(cargar, intervaloMs)
    return () => {
      cancelado = true
      clearInterval(id)
    }
  }, [url, intervaloMs])

  return estado
}
