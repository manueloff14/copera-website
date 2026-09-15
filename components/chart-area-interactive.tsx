"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { Corrida } from "@/lib/dashboard-types"

export const description = "Tokens y eventos consumidos por corrida"

const chartConfig = {
  tokens: {
    label: "Tokens",
    color: "var(--primary)",
  },
  eventos: {
    label: "Eventos (x1000)",
    color: "var(--primary)",
  },
} satisfies ChartConfig

// El nombre de la corrida empieza con su marca de tiempo, p. ej.
// "20260912T231847_factorial-base" (ver dashboard/servidor.py, _corridas()).
function timestampDeCorrida(nombre: string): number {
  const m = /^(\d{8})T(\d{6})/.exec(nombre)
  if (!m) return 0
  const [, fecha, hora] = m
  const iso = `${fecha.slice(0, 4)}-${fecha.slice(4, 6)}-${fecha.slice(6, 8)}T${hora.slice(0, 2)}:${hora.slice(2, 4)}:${hora.slice(4, 6)}`
  const t = new Date(iso).getTime()
  return Number.isNaN(t) ? 0 : t
}

export function ChartAreaInteractive({ corridas }: { corridas: Corrida[] }) {
  const isMobile = useIsMobile()
  const [rango, setRango] = React.useState("todas")

  React.useEffect(() => {
    if (isMobile) {
      setRango("10")
    }
  }, [isMobile])

  const ordenadas = React.useMemo(
    () =>
      [...corridas]
        .map((c) => ({ ...c, ts: timestampDeCorrida(c.corrida) }))
        .sort((a, b) => a.ts - b.ts),
    [corridas]
  )

  const filtradas = React.useMemo(() => {
    if (rango === "todas") return ordenadas
    return ordenadas.slice(-Number(rango))
  }, [ordenadas, rango])

  const datos = filtradas.map((c) => ({
    etiqueta: c.ts
      ? new Date(c.ts).toLocaleString("es", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : c.nombre,
    tokens: c.tokens,
    eventos: c.eventos * 1000,
  }))

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Tokens por corrida</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Tokens y eventos consumidos, en orden cronológico
          </span>
          <span className="@[540px]/card:hidden">Tokens por corrida</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            multiple={false}
            value={[rango]}
            onValueChange={(value) => {
              setRango(value[0] ?? "todas")
            }}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="todas">Todas</ToggleGroupItem>
            <ToggleGroupItem value="30">Últimas 30</ToggleGroupItem>
            <ToggleGroupItem value="10">Últimas 10</ToggleGroupItem>
          </ToggleGroup>
          <Select
            value={rango}
            onValueChange={(value) => {
              if (value !== null) {
                setRango(value)
              }
            }}
          >
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Selecciona un rango"
            >
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="todas" className="rounded-lg">
                Todas
              </SelectItem>
              <SelectItem value="30" className="rounded-lg">
                Últimas 30
              </SelectItem>
              <SelectItem value="10" className="rounded-lg">
                Últimas 10
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={datos}>
            <defs>
              <linearGradient id="fillTokens" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-tokens)"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-tokens)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillEventos" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-eventos)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-eventos)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="etiqueta"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Area
              dataKey="eventos"
              type="natural"
              fill="url(#fillEventos)"
              stroke="var(--color-eventos)"
              stackId="a"
            />
            <Area
              dataKey="tokens"
              type="natural"
              fill="url(#fillTokens)"
              stroke="var(--color-tokens)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
