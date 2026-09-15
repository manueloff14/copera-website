"use client"

import * as React from "react"
import { AlertTriangleIcon } from "lucide-react"

import { AgentTimeline } from "@/components/agent-timeline"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { usePollingJson } from "@/hooks/use-polling-json"
import { agregarCorridas } from "@/lib/agregado"
import type { Agregado, Corrida } from "@/lib/dashboard-types"
import { modeloDe, modelosSeleccionables } from "@/lib/modelos"

const INTERVALO_MS = 15_000

export function DashboardClient({
  corridasIniciales,
  agregadoInicial,
}: {
  corridasIniciales: Corrida[]
  agregadoInicial: Agregado | null
}) {
  const corridas = usePollingJson<Corrida[]>(
    "/api/dashboard/corridas",
    INTERVALO_MS,
    corridasIniciales
  )
  const agregado = usePollingJson<Agregado>(
    "/api/dashboard/agregado",
    INTERVALO_MS,
    agregadoInicial
  )

  const todas = React.useMemo(() => corridas.data ?? [], [corridas.data])
  const modelos = React.useMemo(() => modelosSeleccionables(todas), [todas])

  const [eleccion, setEleccion] = React.useState<string | null>(null)
  // Si el modelo elegido deja de estar (o aun no se eligio), cae al que mas corridas tiene.
  const modeloSeleccion =
    eleccion && modelos.some(([m]) => m === eleccion) ? eleccion : (modelos[0]?.[0] ?? null)

  const delModelo = React.useMemo(
    () => (modeloSeleccion ? todas.filter((c) => modeloDe(c) === modeloSeleccion) : []),
    [todas, modeloSeleccion]
  )

  // Las tarjetas se recalculan sobre las corridas del modelo; del servidor solo se toman los
  // datos globales (preregistro, hash vigente, presupuesto).
  const agregadoModelo = React.useMemo(
    () => (agregado.data ? agregarCorridas(delModelo, agregado.data) : null),
    [delModelo, agregado.data]
  )

  const error = corridas.error ?? agregado.error
  const actualizadoEn = corridas.actualizadoEn ?? agregado.actualizadoEn

  return (
    // Sin padding arriba: el lienzo de agentes arranca pegado al borde, bajo el header.
    <div className="flex flex-col gap-4 pb-4 md:gap-6 md:pb-6">
      {error && (
        <div className="fixed top-20 left-1/2 z-40 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2 rounded-lg border border-destructive/50 bg-[#1a0f0f]/95 px-4 py-2 text-sm text-destructive backdrop-blur">
          <AlertTriangleIcon className="size-4 shrink-0" />
          <span>
            No se pudo actualizar contra dashboard/servidor.py: {error}. Se
            muestran los últimos datos disponibles.
          </span>
        </div>
      )}
      <AgentTimeline
        corridas={delModelo}
        modelos={modelos}
        modeloSeleccion={modeloSeleccion}
        onModeloChange={setEleccion}
      />
      <SectionCards agregado={agregadoModelo} />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive corridas={delModelo} />
      </div>
      <DataTable data={delModelo} />
      {actualizadoEn && (
        <div className="px-4 text-xs text-muted-foreground lg:px-6">
          Última actualización: {actualizadoEn.toLocaleTimeString("es")}
        </div>
      )}
    </div>
  )
}
