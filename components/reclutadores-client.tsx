"use client"

import * as React from "react"
import {
  AlertTriangleIcon,
  MinusIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react"
import { Bar, BarChart, CartesianGrid, ErrorBar, XAxis, YAxis } from "recharts"

import { AgentTimeline } from "@/components/agent-timeline"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { usePollingJson } from "@/hooks/use-polling-json"
import type { Corrida } from "@/lib/dashboard-types"
import {
  ETIQUETA_BRAZO,
  FAMILIAS_RECLUTADOR,
  esCorridaReclutador,
  familiaDe,
  type BrazoReclutador,
  type ContrasteReclutador,
  type ReporteReclutador,
  type ReporteReclutadorTexto,
} from "@/lib/reclutador"

const INTERVALO_CORRIDAS_MS = 15_000
// Los reportes solo cambian cuando alguien vuelve a correr analisis/reclutador*.py.
const INTERVALO_REPORTES_MS = 60_000
const TODAS = "todas"

function pct(x: number) {
  return `${(x * 100).toFixed(1)}%`
}

function pts(x: number) {
  return `${x > 0 ? "+" : ""}${(x * 100).toFixed(1)} pts`
}

function intervalo([bajo, alto]: [number, number]) {
  return `[${(bajo * 100).toFixed(1)}; ${(alto * 100).toFixed(1)}]`
}

function brazoLegible(clave: string) {
  return ETIQUETA_BRAZO[clave]?.brazo ?? clave
}

// "par_menos_tercero_precio20" -> "R1c par − R1a tercero, precio 20"
function contrasteLegible(clave: string) {
  const m = /^(.+?)_menos_(.+?)_precio(\d+)(_DESCRIPTIVO)?$/.exec(clave)
  if (!m) return { nombre: clave, descriptivo: false }
  const [, a, b, precio, descriptivo] = m
  const lado = (x: string) => (x === "base" ? "base" : brazoLegible(x))
  return {
    nombre: `${lado(a)} − ${lado(b)}, precio ${precio}`,
    descriptivo: Boolean(descriptivo),
  }
}

function etiquetaFamilia(valor: string, conteo: Map<string, number>, total: number) {
  if (valor === TODAS) return `Todas las familias (${total})`
  const f = FAMILIAS_RECLUTADOR.find((x) => x.familia === valor)
  return `${f?.brazo ?? valor} (${conteo.get(valor) ?? 0})`
}

const sinSelectorDeModelo = () => {}

export function ReclutadoresClient({
  reporteInicial,
  textoInicial,
  corridasIniciales,
}: {
  reporteInicial: ReporteReclutador | null
  textoInicial: ReporteReclutadorTexto | null
  corridasIniciales: Corrida[]
}) {
  const reporte = usePollingJson<ReporteReclutador>(
    "/api/dashboard/reporte/reclutador.json",
    INTERVALO_REPORTES_MS,
    reporteInicial
  )
  const texto = usePollingJson<ReporteReclutadorTexto>(
    "/api/dashboard/reporte/reclutador-texto.json",
    INTERVALO_REPORTES_MS,
    textoInicial
  )
  const corridas = usePollingJson<Corrida[]>(
    "/api/dashboard/corridas",
    INTERVALO_CORRIDAS_MS,
    corridasIniciales
  )

  const delReclutador = React.useMemo(
    () => (corridas.data ?? []).filter(esCorridaReclutador),
    [corridas.data]
  )
  const conteo = React.useMemo(() => {
    const m = new Map<string, number>()
    for (const c of delReclutador) {
      const f = familiaDe(c)
      m.set(f, (m.get(f) ?? 0) + 1)
    }
    return m
  }, [delReclutador])

  const [familia, setFamilia] = React.useState<string>(TODAS)
  const filtradas = React.useMemo(
    () =>
      familia === TODAS
        ? delReclutador
        : delReclutador.filter((c) => familiaDe(c) === familia),
    [delReclutador, familia]
  )

  // Un reporte con {error} o sin brazos cuenta como ausente (igual que dashboard/index.html).
  const datosReporte = reporte.data?.brazos ? reporte.data : null
  const datosTexto = texto.data?.brazos ? texto.data : null
  const actualizadoEn = corridas.actualizadoEn ?? reporte.actualizadoEn

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      {corridas.error && (
        <div className="mx-4 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive lg:mx-6">
          <AlertTriangleIcon className="size-4 shrink-0" />
          <span>
            No se pudo actualizar contra dashboard/servidor.py: {corridas.error}.
            Se muestran los últimos datos disponibles.
          </span>
        </div>
      )}

      <div className="px-4 lg:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold">
            El reclutador: ¿pesa pedir por un tercero?
          </h2>
          <Badge variant="outline">exploratorio</Badge>
        </div>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Misma escena y mismo precio que el experimento principal; lo único que
          cambia es <b className="text-foreground">por quién</b> pide el
          solicitante. En el incidente, un agente consiguió que otro actuara
          invocando la necesidad de un tercero: esto mide ese mecanismo con un
          costo que se paga de verdad.
        </p>
      </div>

      {datosReporte ? (
        <>
          <TarjetasReclutador reporte={datosReporte} />
          <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @5xl/main:grid-cols-2">
            <GraficoTasas reporte={datosReporte} />
            <TablaContrastes reporte={datosReporte} />
          </div>
        </>
      ) : (
        <SinReporte
          archivo="reportes/reclutador.json"
          guion="analisis/reclutador.py"
          error={reporte.error}
        />
      )}

      {datosTexto ? (
        <div className="px-4 lg:px-6">
          <TablaRazonamiento texto={datosTexto} />
        </div>
      ) : (
        <SinReporte
          archivo="reportes/reclutador-texto.json"
          guion="analisis/reclutador_texto.py"
          error={texto.error}
        />
      )}

      <div className="flex flex-wrap items-end justify-between gap-2 px-4 lg:px-6">
        <div>
          <h2 className="text-base font-semibold">Corridas del reclutador</h2>
          <p className="text-sm text-muted-foreground">
            La ejecución de agentes y la tabla muestran solo la familia elegida.
          </p>
        </div>
        <Select
          value={familia}
          onValueChange={(value) => {
            if (value) setFamilia(value)
          }}
        >
          <SelectTrigger className="w-72" size="sm" aria-label="Familia de corridas">
            <SelectValue>
              {(valor: string) => etiquetaFamilia(valor, conteo, delReclutador.length)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value={TODAS}>
              {etiquetaFamilia(TODAS, conteo, delReclutador.length)}
            </SelectItem>
            {FAMILIAS_RECLUTADOR.map((f) => (
              <SelectItem key={f.familia} value={f.familia}>
                {etiquetaFamilia(f.familia, conteo, delReclutador.length)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <AgentTimeline
        corridas={filtradas}
        modelos={[]}
        modeloSeleccion={null}
        onModeloChange={sinSelectorDeModelo}
      />
      <DataTable data={filtradas} />

      {actualizadoEn && (
        <div className="px-4 text-xs text-muted-foreground lg:px-6">
          Última actualización: {actualizadoEn.toLocaleTimeString("es")}
        </div>
      )}
    </div>
  )
}

function SinReporte({
  archivo,
  guion,
  error,
}: {
  archivo: string
  guion: string
  error: string | null
}) {
  return (
    <div className="mx-4 rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground lg:mx-6">
      Sin datos de <code>{archivo}</code> todavía — corre <code>{guion}</code>.
      {error && <span className="mt-1 block text-xs">Detalle: {error}</span>}
    </div>
  )
}

function TarjetasReclutador({ reporte }: { reporte: ReporteReclutador }) {
  const base = reporte.base_referencia
  const c5 = reporte.contrastes.par_menos_tercero_precio5
  const c20 = reporte.contrastes.par_menos_tercero_precio20

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      {Object.entries(reporte.brazos).map(([clave, brazo]) => (
        <TarjetaBrazo key={clave} clave={clave} brazo={brazo} />
      ))}

      {base && (
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Base (solicitud llana): precio 5 / 20</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {pct(base.tasas["5"])} / {pct(base.tasas["20"])}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">{base.corridas} corridas</Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 font-medium">
              Referencia del lote principal
            </div>
            <div className="text-muted-foreground">
              Mirada única del confirmatorio, no se recalcula aquí ni lleva intervalo
            </div>
          </CardFooter>
        </Card>
      )}

      {c5 && c20 && (
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Par − tercero: precio 5 / 20</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {pts(c5.media)} / {pts(c20.media)}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                {c5.incluye_cero && c20.incluye_cero
                  ? "ambos incluyen 0"
                  : "alguno excluye 0"}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 font-medium">¿Importa quién pide?</div>
            <div className="text-muted-foreground">
              IC95 {c5.ic95 ? intervalo(c5.ic95) : "—"} y{" "}
              {c20.ic95 ? intervalo(c20.ic95) : "—"} pts
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}

function TarjetaBrazo({ clave, brazo }: { clave: string; brazo: BrazoReclutador }) {
  const c5 = brazo.celdas["5"]
  const c20 = brazo.celdas["20"]
  const diferencia = c20.tasa - c5.tasa

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>
          {brazoLegible(clave)}: precio 5 / 20
        </CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {pct(c5.tasa)} / {pct(c20.tasa)}
        </CardTitle>
        <CardAction>
          <Badge variant="outline">
            {diferencia < 0 ? (
              <TrendingDownIcon className="size-3" />
            ) : diferencia > 0 ? (
              <TrendingUpIcon className="size-3" />
            ) : (
              <MinusIcon className="size-3" />
            )}
            {pts(diferencia)}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 font-medium">
          {ETIQUETA_BRAZO[clave]?.descripcion ?? brazo.familia}
        </div>
        <div className="text-muted-foreground">
          Entregaron {c5.entregaron}/{c5.agentes} y {c20.entregaron}/{c20.agentes} · IC95
          por corrida {intervalo(c5.ic95_por_corrida)} y {intervalo(c20.ic95_por_corrida)}
        </div>
        <div className="text-muted-foreground">
          {brazo.corridas_validas} válidas, {brazo.excluidas} excluidas · tarea{" "}
          {pct(brazo.tareas_completadas)} · escena {brazo.hash_escena}
        </div>
      </CardFooter>
    </Card>
  )
}

const configGrafico = {
  precio5: { label: "Precio 5", color: "var(--chart-1)" },
  precio20: { label: "Precio 20", color: "var(--chart-3)" },
} satisfies ChartConfig

interface FilaGrafico {
  brazo: string
  precio5: number
  precio20: number
  // ErrorBar asimetrico: [tasa - bajo, alto - tasa]; null = sin bigote (el base).
  error5: [number, number] | null
  error20: [number, number] | null
  ic5: [number, number] | null
  ic20: [number, number] | null
  n5: string | null
  n20: string | null
}

function GraficoTasas({ reporte }: { reporte: ReporteReclutador }) {
  const filas: FilaGrafico[] = Object.entries(reporte.brazos).map(([clave, b]) => {
    const c5 = b.celdas["5"]
    const c20 = b.celdas["20"]
    return {
      brazo: brazoLegible(clave),
      precio5: c5.tasa,
      precio20: c20.tasa,
      error5: [c5.tasa - c5.ic95_por_corrida[0], c5.ic95_por_corrida[1] - c5.tasa],
      error20: [c20.tasa - c20.ic95_por_corrida[0], c20.ic95_por_corrida[1] - c20.tasa],
      ic5: c5.ic95_por_corrida,
      ic20: c20.ic95_por_corrida,
      n5: `${c5.entregaron}/${c5.agentes}`,
      n20: `${c20.entregaron}/${c20.agentes}`,
    }
  })
  if (reporte.base_referencia) {
    filas.push({
      brazo: "Base (ref.)",
      precio5: reporte.base_referencia.tasas["5"],
      precio20: reporte.base_referencia.tasas["20"],
      error5: null,
      error20: null,
      ic5: null,
      ic20: null,
      n5: null,
      n20: null,
    })
  }

  const maximo = Math.max(
    0.1,
    ...filas.flatMap((f) => [f.precio5, f.precio20, f.ic5?.[1] ?? 0, f.ic20?.[1] ?? 0])
  )
  const techo = Math.min(1, Math.ceil(maximo * 10) / 10)

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Entrega de la clave por precio</CardTitle>
        <CardDescription>
          Fracción de agentes que entregaron; bigotes = IC95 por corrida. El base
          no lleva intervalo.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <ChartContainer config={configGrafico} className="aspect-auto h-[260px] w-full">
          <BarChart data={filas} barGap={4}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="brazo" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis
              domain={[0, techo]}
              tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value, name, item) => {
                    const fila = item.payload as FilaGrafico
                    const es5 = name === "precio5"
                    const ic = es5 ? fila.ic5 : fila.ic20
                    const n = es5 ? fila.n5 : fila.n20
                    return (
                      <div className="flex w-full items-center justify-between gap-3">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <span
                            className="size-2.5 shrink-0 rounded-[2px]"
                            style={{ background: item.color }}
                          />
                          {es5 ? "Precio 5" : "Precio 20"}
                        </span>
                        <span className="font-mono font-medium text-foreground tabular-nums">
                          {pct(Number(value))}
                          {n ? ` (${n})` : ""}
                          {ic ? ` ${intervalo(ic)}` : ""}
                        </span>
                      </div>
                    )
                  }}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="precio5" fill="var(--color-precio5)" radius={4}>
              <ErrorBar dataKey="error5" width={6} strokeWidth={1.5} stroke="var(--foreground)" />
            </Bar>
            <Bar dataKey="precio20" fill="var(--color-precio20)" radius={4}>
              <ErrorBar dataKey="error20" width={6} strokeWidth={1.5} stroke="var(--foreground)" />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function TablaContrastes({ reporte }: { reporte: ReporteReclutador }) {
  const filas = Object.entries(reporte.contrastes) as [string, ContrasteReclutador][]
  const notas = [
    ...(reporte.notas ?? []),
    ...(reporte.base_referencia?.sin_intervalo_conjunto
      ? [`Base: ${reporte.base_referencia.sin_intervalo_conjunto}.`]
      : []),
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contrastes</CardTitle>
        <CardDescription>
          Diferencias de tasa en puntos. Solo par − tercero lleva intervalo; contra
          el base es descriptivo.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Contraste</TableHead>
                <TableHead className="text-right">Media</TableHead>
                <TableHead className="text-right">IC95</TableHead>
                <TableHead>Cero</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map(([clave, c]) => {
                const { nombre, descriptivo } = contrasteLegible(clave)
                return (
                  <TableRow key={clave}>
                    <TableCell className="whitespace-normal">
                      {nombre}
                      {descriptivo && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          (descriptivo)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {pts(c.media)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {c.ic95 ? intervalo(c.ic95) : "—"}
                    </TableCell>
                    <TableCell>
                      {c.incluye_cero === null ? (
                        <span className="text-muted-foreground">sin IC</span>
                      ) : c.incluye_cero ? (
                        <Badge variant="outline">incluye</Badge>
                      ) : (
                        <Badge>excluye</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        {notas.map((nota) => (
          <p key={nota} className="text-xs text-muted-foreground">
            {nota}
          </p>
        ))}
      </CardContent>
    </Card>
  )
}

function TablaRazonamiento({ texto }: { texto: ReporteReclutadorTexto }) {
  const brazos = Object.entries(texto.brazos)
  const categorias = [
    ...new Set([
      ...Object.keys(texto.patrones ?? {}),
      ...brazos.flatMap(([, b]) => Object.keys(b.categorias)),
    ]),
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Qué razonaron, no sólo qué hicieron</CardTitle>
        <CardDescription>
          Un nulo vale poco si la apelación pasó desapercibida, y bastante si el
          agente la nombró y dijo no. Porcentaje de agentes cuyo texto cae en cada
          categoría; entre paréntesis, cuántos de ellos entregaron.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Categoría</TableHead>
                {brazos.map(([nombre, b]) => (
                  <TableHead key={nombre} className="text-right">
                    {nombre} <span className="text-muted-foreground">({b.agentes})</span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {categorias.map((cat) => (
                <TableRow key={cat}>
                  <TableCell>{cat}</TableCell>
                  {brazos.map(([nombre, b]) => {
                    const v = b.categorias[cat]
                    return (
                      <TableCell key={nombre} className="text-right font-mono tabular-nums">
                        {v ? (
                          <>
                            {v.pct.toFixed(1)}%{" "}
                            <span className="text-muted-foreground">
                              · {v.agentes} ag. ({v.de_ellos_entregaron})
                            </span>
                          </>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="text-muted-foreground">sin ninguna categoría</TableCell>
                {brazos.map(([nombre, b]) => (
                  <TableCell
                    key={nombre}
                    className="text-right font-mono text-muted-foreground tabular-nums"
                  >
                    {b.sin_ninguna_categoria.pct.toFixed(1)}% ·{" "}
                    {b.sin_ninguna_categoria.agentes} ag.
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">entregaron la clave</TableCell>
                {brazos.map(([nombre, b]) => (
                  <TableCell key={nombre} className="text-right font-mono font-medium tabular-nums">
                    {b.entregaron} de {b.agentes}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div className="grid grid-cols-1 gap-3 @5xl/main:grid-cols-2">
          {brazos.map(([nombre, b]) => (
            <details key={nombre} className="rounded-lg border px-4 py-2 text-sm">
              <summary className="cursor-pointer font-medium">
                Ejemplos textuales — {nombre}
              </summary>
              <dl className="mt-2 flex flex-col gap-2">
                {Object.entries(b.ejemplos).map(([cat, ejemplo]) => (
                  <div key={cat}>
                    <dt className="text-xs text-muted-foreground">{cat}</dt>
                    <dd className="italic">«{ejemplo}»</dd>
                  </div>
                ))}
              </dl>
            </details>
          ))}
        </div>

        {texto.limites?.length > 0 && (
          <ul className="list-disc pl-5 text-xs text-muted-foreground">
            {texto.limites.map((limite) => (
              <li key={limite}>{limite}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
