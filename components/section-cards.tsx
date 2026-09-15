"use client"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  AlertTriangleIcon,
  MinusIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react"
import type { Agregado } from "@/lib/dashboard-types"

function pct(x: number) {
  return `${(x * 100).toFixed(1)}%`
}

function num(x: number) {
  return x.toLocaleString("es")
}

export function SectionCards({ agregado }: { agregado: Agregado | null }) {
  const vigente = agregado?.grupos.find((g) => g.vigente) ?? null
  const celdas = vigente?.celdas
  const tasa5 = celdas?.clave.precio5.tasa
  const tasa20 = celdas?.clave.precio20.tasa
  const diferencia =
    tasa5 !== undefined && tasa20 !== undefined ? tasa20 - tasa5 : null
  const tarea = vigente?.tarea
  const contabilidad = agregado?.contabilidad
  const presupuesto = contabilidad?.presupuesto ?? null
  const margen = contabilidad?.margen ?? null
  const sobrePresupuesto = margen !== null && margen < 0

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Corridas del diseño vigente</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {vigente ? num(vigente.corridas) : "—"}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {agregado ? num(agregado.contabilidad.corridas_totales) : "—"}{" "}
              totales
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 font-medium">
            Preregistradas: {agregado?.n_preregistrado ?? "—"}
          </div>
          <div className="text-muted-foreground">
            Hash vigente {agregado?.vigente_hash ?? "—"}
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Depósito de la clave: precio 5 / 20</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {tasa5 !== undefined ? pct(tasa5) : "—"} /{" "}
            {tasa20 !== undefined ? pct(tasa20) : "—"}
          </CardTitle>
          <CardAction>
            {diferencia !== null && (
              <Badge variant="outline">
                {diferencia < 0 ? (
                  <TrendingDownIcon className="size-3" />
                ) : diferencia > 0 ? (
                  <TrendingUpIcon className="size-3" />
                ) : (
                  <MinusIcon className="size-3" />
                )}
                {diferencia >= 0 ? "+" : ""}
                {pct(diferencia)}
              </Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 font-medium">
            H1: precio 20 menos precio 5
          </div>
          <div className="text-muted-foreground">
            {celdas
              ? `n=${celdas.clave.precio5.n} y n=${celdas.clave.precio20.n} por celda`
              : "sin celdas del brazo factorial todavía"}
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Tarea completada</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {tarea ? pct(tarea.ok / tarea.n) : "—"}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {tarea ? `${tarea.ok}/${tarea.n}` : "—"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 font-medium">
            Agentes del diseño vigente
          </div>
          <div className="text-muted-foreground">
            {vigente ? `${num(vigente.agentes)} agentes` : "—"}
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>
            {presupuesto !== null ? "Tokens usados / presupuesto" : "Tokens usados"}
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {contabilidad ? num(contabilidad.tokens) : "—"}
          </CardTitle>
          {margen !== null && (
            <CardAction>
              <Badge variant={sobrePresupuesto ? "destructive" : "outline"}>
                {sobrePresupuesto ? (
                  <AlertTriangleIcon className="size-3" />
                ) : (
                  <TrendingUpIcon className="size-3" />
                )}
                {num(margen)}
              </Badge>
            </CardAction>
          )}
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          {presupuesto !== null ? (
            <>
              <div className="line-clamp-1 font-medium">
                {sobrePresupuesto ? "Sobre presupuesto" : "Dentro del presupuesto"}
              </div>
              <div className="text-muted-foreground">
                Presupuesto: {num(presupuesto)} tokens
              </div>
            </>
          ) : (
            <>
              <div className="line-clamp-1 font-medium">Sin techo de presupuesto</div>
              <div className="text-muted-foreground">
                Suma de todas las corridas
              </div>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
