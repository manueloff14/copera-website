"use client"

import * as React from "react"
import { LoaderIcon, Maximize2Icon, ZoomInIcon, ZoomOutIcon } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { usePollingJson } from "@/hooks/use-polling-json"
import type { Corrida, CorridaDetalle, Evento } from "@/lib/dashboard-types"
import { etiquetaModelo, logoModelo } from "@/lib/modelos"

const INTERVALO_MS = 15_000

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

function rutaProxy(rel: string): string {
  return `/api/dashboard/corrida/${rel.split("/").map(encodeURIComponent).join("/")}`
}

// --- Geometria del diagrama de columnas -----------------------------------

const COL_ANCHO = 208
const COL_GAP = 56
const COL_PAD = 12
const CAJA_ALTO = 68
const CAJA_GAP = 8
const CABECERA_ALTO = 40

// "deposito" y "consulta" son las dos categorias que representan una llamada
// real al puerto del recurso compartido: son comunicacion confirmada por el
// log, no una inferencia. Lo unico que se infiere es QUE deposito especifico
// pudo haber leido una consulta especifica (ver conexiones, mas abajo).
type Categoria =
  | "deposito"
  | "consulta"
  | "entrega"
  | "rechazado"
  | "tope"
  | "accion"

const ESTILO_CATEGORIA: Record<
  Categoria,
  { etiqueta: string; fill: string; stroke: string; texto: string }
> = {
  deposito: { etiqueta: "Comunicación", fill: "#123a33", stroke: "#2dd4bf", texto: "#5eead4" },
  consulta: { etiqueta: "Comunicación", fill: "#0f2a3a", stroke: "#38bdf8", texto: "#7dd3fc" },
  entrega: { etiqueta: "Entrega", fill: "#332a12", stroke: "#f59e0b", texto: "#fcd34d" },
  rechazado: { etiqueta: "Rechazado", fill: "#3a1414", stroke: "#f87171", texto: "#fca5a5" },
  tope: { etiqueta: "Tope tokens", fill: "#3a220f", stroke: "#fb923c", texto: "#fdba74" },
  accion: { etiqueta: "Acción", fill: "#1c1c1c", stroke: "#3a3a3a", texto: "#d4d4d4" },
}

// Texto de la segunda linea de cada caja (bajo la etiqueta de categoria).
// deposito/consulta llevan una flecha de direccion para diferenciarlas sin
// perder el rotulo comun "Comunicación".
function subEtiqueta(categoria: Categoria): string {
  if (categoria === "deposito") return "→ deposita"
  if (categoria === "consulta") return "← consulta"
  return ""
}

function truncar(s: string, max = 34): string {
  if (!s) return ""
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s
}

// Hora de reloj (hora:minuto:segundo) a partir del epoch en segundos que trae
// cada evento, para poder ubicar una caja en el tiempo sin abrir el tooltip.
function formatoHora(t: number): string {
  return new Date(t * 1000).toLocaleTimeString("es", { hour12: false })
}

// Lista compacta de agentes emisores para mostrar dentro de una caja
// receptora, p. ej. "agente-02, agente-03 +2".
function formatoFuentes(fuentes: string[]): string {
  const cortos = fuentes.map((f) => f.replace(/^agente-/, "a"))
  if (cortos.length <= 2) return cortos.join(", ")
  return `${cortos.slice(0, 2).join(", ")} +${cortos.length - 2}`
}

interface Caja {
  seq: number
  ronda: number
  categoria: Categoria
  detalle: string
  cuenta?: number
  costo: number
  t: number
  restanteTexto?: string
}

// Texto de detalle a mostrar para un evento (el campo "detalle" del log no
// siempre trae lo mas util: para "comando: X" y "comando_rechazado: X" el
// comando esta en "tipo", y para depositos el tamano tambien esta en "tipo").
function detalleParaEvento(ev: Evento): string {
  if (ev.tipo.startsWith("comando: ")) return ev.tipo.slice("comando: ".length)
  if (ev.tipo.startsWith("comando_rechazado: "))
    return ev.tipo.slice("comando_rechazado: ".length)
  const mDep = /^depositar \((\d+) car\)/.exec(ev.tipo)
  if (mDep) return `${mDep[1]} caracteres`
  return ev.detalle || ""
}

// El log ya trae el presupuesto real ("costo N, restantes M") en el campo
// "detalle" de comando/comando_rechazado/depositar — se extrae aparte para
// no perderlo cuando detalleParaEvento reemplaza el detalle con el comando.
function restanteTexto(ev: Evento): string | undefined {
  const m = /^costo\s+\d+,\s*restantes.*$/i.exec(ev.detalle || "")
  return m ? m[0] : undefined
}

// Agrupa corridas consecutivas de comando_rechazado del mismo agente en una
// sola caja (con contador) para que la columna no se sature de ruido.
function comprimir(eventos: Evento[]): Caja[] {
  const salida: Caja[] = []
  for (const ev of eventos) {
    const categoria = categoriaBase(ev)
    const ultimo = salida[salida.length - 1]
    if (categoria === "rechazado" && ultimo?.categoria === "rechazado") {
      ultimo.cuenta = (ultimo.cuenta ?? 1) + 1
      ultimo.seq = ev.seq
      ultimo.costo += ev.costo
      ultimo.t = ev.t
      ultimo.restanteTexto = restanteTexto(ev) ?? ultimo.restanteTexto
      continue
    }
    salida.push({
      seq: ev.seq,
      ronda: ev.ronda,
      categoria,
      detalle: detalleParaEvento(ev),
      cuenta: categoria === "rechazado" ? 1 : undefined,
      costo: ev.costo,
      t: ev.t,
      restanteTexto: restanteTexto(ev),
    })
  }
  return salida
}

function categoriaBase(ev: Evento): Categoria {
  if (ev.tipo.startsWith("depositar")) return "deposito"
  if (ev.tipo === "consulta") return "consulta"
  if (ev.tipo === "entregar") return "entrega"
  if (ev.tipo.startsWith("comando_rechazado")) return "rechazado"
  if (ev.tipo === "tope_tokens") return "tope"
  return "accion"
}

interface ColumnaCalculada {
  agente: string
  cajas: (Caja & {
    x: number
    y: number
    esReceptor: boolean
    fuentes?: string[]
    destinos?: string[]
  })[]
}

interface Conexion {
  x1: number
  y1: number
  x2: number
  y2: number
  desde: string
  hasta: string
}

interface DiagramaCalculado {
  ancho: number
  alto: number
  columnas: ColumnaCalculada[]
  conexiones: Conexion[]
  huboDepositoValido: boolean
}

function construirDiagrama(detalle: CorridaDetalle): DiagramaCalculado {
  const agentesIds = detalle.agentes.map((a) => a.id)

  // Detecta que eventos de "consulta" pudieron leer un deposito anterior de
  // otro agente. No hay campo en el log que diga quien leyo el deposito de
  // quien: se infiere una ventana de vigencia por deposito (desde que se
  // hizo hasta que ese mismo agente vuelve a depositar, o el fin de la
  // corrida) y se conecta con TODAS las consultas de otros agentes dentro de
  // esa ventana - un deposito puede así quedar conectado con dos o mas
  // agentes que lo consultaron, y una consulta puede recibir de dos o mas
  // depositos distintos.
  const eventosOrdenados = [...detalle.eventos].sort((a, b) => a.seq - b.seq)
  // Si esta corrida no tuvo ni un solo deposito valido (los agentes solo lo
  // intentaron por comandos crudos que el harness no reconocio, o el deposito
  // fue rechazado), marcar cada consulta como "sin deposito previo" no aporta
  // nada: todas quedarian iguales. Ese aviso solo tiene sentido cuando SI hubo
  // al menos un deposito en la corrida y aun asi una consulta puntual no logro
  // conectarse a el.
  const huboDepositoValido = eventosOrdenados.some(
    (e) => e.agente && e.tipo.startsWith("depositar")
  )
  const seqsQueReciben = new Set<number>()
  const conexionesPorSeq: { depSeq: number; recSeq: number; desde: string; hasta: string }[] = []
  for (const dep of eventosOrdenados) {
    if (!dep.agente || !dep.tipo.startsWith("depositar")) continue
    const siguientePropio = eventosOrdenados.find(
      (e) => e.seq > dep.seq && e.agente === dep.agente && e.tipo.startsWith("depositar")
    )
    const limiteSeq = siguientePropio ? siguientePropio.seq : Infinity
    const lectores = eventosOrdenados.filter(
      (e) =>
        e.seq > dep.seq &&
        e.seq < limiteSeq &&
        e.agente &&
        e.agente !== dep.agente &&
        e.tipo === "consulta"
    )
    for (const lector of lectores) {
      if (!lector.agente) continue
      seqsQueReciben.add(lector.seq)
      conexionesPorSeq.push({
        depSeq: dep.seq,
        recSeq: lector.seq,
        desde: dep.agente,
        hasta: lector.agente,
      })
    }
  }

  // Lista de agentes emisores por consulta receptora, y de agentes lectores
  // por deposito: se muestran en la caja misma para que quede claro con
  // quién hubo comunicación (o que nadie la recogió) aunque la curva que los
  // une esté fuera del área visible del lienzo (zoom/pan).
  const fuentesPorSeq = new Map<number, string[]>()
  const destinosPorSeq = new Map<number, string[]>()
  const depositosVistos = new Set<number>()
  for (const { depSeq, recSeq, desde, hasta } of conexionesPorSeq) {
    depositosVistos.add(depSeq)
    const fuentes = fuentesPorSeq.get(recSeq) ?? []
    if (!fuentes.includes(desde)) fuentes.push(desde)
    fuentesPorSeq.set(recSeq, fuentes)

    const destinos = destinosPorSeq.get(depSeq) ?? []
    if (!destinos.includes(hasta)) destinos.push(hasta)
    destinosPorSeq.set(depSeq, destinos)
  }
  // Depositos que quedaron "a la deriva": nadie los consultó dentro de su
  // ventana de vigencia (antes de que ese mismo agente volviera a depositar).
  for (const dep of eventosOrdenados) {
    if (dep.agente && dep.tipo.startsWith("depositar") && !depositosVistos.has(dep.seq)) {
      destinosPorSeq.set(dep.seq, [])
    }
  }

  const posicionPorSeq = new Map<number, { x: number; y: number }>()
  let maxCajas = 0

  const columnas: ColumnaCalculada[] = agentesIds.map((id, i) => {
    const propios = detalle.eventos
      .filter((e) => e.agente === id)
      .sort((a, b) => a.seq - b.seq)
    const cajasFinal = comprimir(propios)

    maxCajas = Math.max(maxCajas, cajasFinal.length)
    const x = COL_GAP / 2 + i * (COL_ANCHO + COL_GAP)
    const conPosicion = cajasFinal.map((c, idx) => {
      const y = CABECERA_ALTO + idx * (CAJA_ALTO + CAJA_GAP)
      posicionPorSeq.set(c.seq, { x, y })
      return {
        ...c,
        x,
        y,
        esReceptor: seqsQueReciben.has(c.seq),
        fuentes: fuentesPorSeq.get(c.seq),
        destinos: destinosPorSeq.get(c.seq),
      }
    })
    return { agente: id, cajas: conPosicion }
  })

  const conexiones: Conexion[] = conexionesPorSeq
    .map(({ depSeq, recSeq, desde, hasta }) => {
      const p1 = posicionPorSeq.get(depSeq)
      const p2 = posicionPorSeq.get(recSeq)
      if (!p1 || !p2) return null
      const iDesde = agentesIds.indexOf(desde)
      const iHasta = agentesIds.indexOf(hasta)
      const x1 = iHasta >= iDesde ? p1.x + COL_ANCHO - COL_PAD : p1.x + COL_PAD
      const x2 = iHasta >= iDesde ? p2.x + COL_PAD : p2.x + COL_ANCHO - COL_PAD
      return {
        x1,
        y1: p1.y + CAJA_ALTO / 2,
        x2,
        y2: p2.y + CAJA_ALTO / 2,
        desde,
        hasta,
      }
    })
    .filter((c): c is Conexion => c !== null)

  const ancho = agentesIds.length * (COL_ANCHO + COL_GAP) + COL_GAP / 2
  const alto = CABECERA_ALTO + maxCajas * (CAJA_ALTO + CAJA_GAP) + 24

  return { ancho, alto, columnas, conexiones, huboDepositoValido }
}

// --- Lienzo con zoom / pan --------------------------------------------------

const ZOOM_MIN = 0.25
const ZOOM_MAX = 2.5
// Espacio al encuadrar: header (64px) + fila de selectores (~72px) arriba.
const MARGEN_ARRIBA = 136
// Zoom maximo del encuadre inicial, para que pocas columnas no queden gigantes.
const ZOOM_AJUSTE = 1
const MARGEN_LADOS = 24
// Transiciones del transform: la entrada al abrir una corrida, los botones y la rueda.
const TRANSICION_INTRO = "transform 1100ms cubic-bezier(0.22, 1, 0.36, 1)"
const TRANSICION_SUAVE = "transform 450ms cubic-bezier(0.22, 1, 0.36, 1)"
const TRANSICION_RUEDA = "transform 160ms ease-out"

type Encuadre = { zoom: number; pan: { x: number; y: number } }

// `clave` identifica la corrida: la animacion de entrada solo corre cuando cambia.
function useLienzo(contenido: { ancho: number; alto: number } | null, clave: string | null) {
  const viewportRef = React.useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = React.useState({ w: 0, h: 0 })
  const [zoom, setZoom] = React.useState(1)
  const [pan, setPan] = React.useState({ x: 0, y: 0 })
  const [transicion, setTransicion] = React.useState("none")
  const arrastre = React.useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const [arrastrando, setArrastrando] = React.useState(false)
  const introDe = React.useRef<string | null>(null)

  const aplicar = (e: Encuadre, trans: string) => {
    setTransicion(trans)
    setZoom(e.zoom)
    setPan(e.pan)
  }

  React.useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const obs = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect
      if (box) setViewport({ w: box.width, h: box.height })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Deja espacio arriba (header + selectores) para que el diagrama no arranque por debajo.
  // "ancho": las columnas llenan la pantalla (hasta ZOOM_AJUSTE) desde arriba; el resto se
  // recorre arrastrando. "completo": todo el diagrama a la vista, punto de partida de la entrada.
  const encuadre = (modo: "ancho" | "completo"): Encuadre | null => {
    if (!contenido || viewport.w === 0 || viewport.h === 0) return null
    const libreW = viewport.w - MARGEN_LADOS * 2
    const libreH = viewport.h - MARGEN_ARRIBA - MARGEN_LADOS
    const z =
      modo === "ancho"
        ? Math.min(ZOOM_AJUSTE, Math.max(ZOOM_MIN, (libreW / contenido.ancho) * 0.85))
        : Math.min(ZOOM_AJUSTE, Math.max(0.05, Math.min(libreW / contenido.ancho, libreH / contenido.alto)))
    return {
      zoom: z,
      pan: {
        x: (viewport.w - contenido.ancho * z) / 2,
        y: modo === "ancho" ? MARGEN_ARRIBA : MARGEN_ARRIBA + Math.max(0, (libreH - contenido.alto * z) / 2),
      },
    }
  }

  const ajustar = () => {
    const e = encuadre("ancho")
    if (e) aplicar(e, TRANSICION_SUAVE)
  }

  // Layout effect: el punto de partida se fija antes de pintar, sin un cuadro suelto en zoom 1.
  React.useLayoutEffect(() => {
    const destino = encuadre("ancho")
    if (!destino) return
    if (introDe.current === clave) {
      aplicar(destino, TRANSICION_SUAVE)
      return
    }
    introDe.current = clave
    aplicar(encuadre("completo")!, "none")
    // Dos cuadros: el navegador pinta el punto de partida y luego anima hacia el destino.
    let r2 = 0
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => aplicar(destino, TRANSICION_INTRO))
    })
    return () => {
      cancelAnimationFrame(r1)
      cancelAnimationFrame(r2)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, contenido?.ancho, contenido?.alto, viewport.w, viewport.h])

  React.useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      // El lienzo llena la pantalla: la rueda sola desplaza la pagina hacia las tarjetas;
      // Ctrl/Cmd + rueda (o pellizco en el trackpad) hace zoom.
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      setTransicion(TRANSICION_RUEDA)
      setZoom((zAnterior) => {
        const factor = e.deltaY < 0 ? 1.35 : 1 / 1.35
        const zNuevo = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zAnterior * factor))
        setPan((pAnterior) => {
          const wx = (mx - pAnterior.x) / zAnterior
          const wy = (my - pAnterior.y) / zAnterior
          return { x: mx - wx * zNuevo, y: my - wy * zNuevo }
        })
        return zNuevo
      })
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    ;(e.target as Element).setPointerCapture(e.pointerId)
    arrastre.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
    // Al arrastrar el diagrama sigue al mouse sin retraso.
    setTransicion("none")
    setArrastrando(true)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!arrastre.current) return
    const dx = e.clientX - arrastre.current.x
    const dy = e.clientY - arrastre.current.y
    setPan({ x: arrastre.current.panX + dx, y: arrastre.current.panY + dy })
  }
  const onPointerUp = () => {
    arrastre.current = null
    setArrastrando(false)
  }

  // Los botones hacen zoom sobre el centro de la vista, no sobre la esquina.
  const zoomAlCentro = (factor: number) => {
    const zNuevo = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom * factor))
    const cx = viewport.w / 2
    const cy = viewport.h / 2
    aplicar(
      { zoom: zNuevo, pan: { x: cx - ((cx - pan.x) / zoom) * zNuevo, y: cy - ((cy - pan.y) / zoom) * zNuevo } },
      TRANSICION_SUAVE
    )
  }
  const acercar = () => zoomAlCentro(1.6)
  const alejar = () => zoomAlCentro(1 / 1.6)

  return {
    viewportRef,
    zoom,
    pan,
    transicion,
    arrastrando,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    acercar,
    alejar,
    ajustar,
  }
}

export function AgentTimeline({
  corridas,
  modelos,
  modeloSeleccion,
  onModeloChange,
}: {
  corridas: Corrida[]
  modelos: [string, number][]
  modeloSeleccion: string | null
  onModeloChange: (modelo: string) => void
}) {
  const ordenadas = React.useMemo(
    () =>
      [...corridas].sort(
        (a, b) => timestampDeCorrida(b.corrida) - timestampDeCorrida(a.corrida)
      ),
    [corridas]
  )

  const [seleccion, setSeleccion] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (ordenadas.length === 0) return
    if (!seleccion || !ordenadas.some((c) => c.corrida === seleccion)) {
      setSeleccion(ordenadas[0].corrida)
    }
  }, [seleccion, ordenadas])

  const rel = seleccion ?? ordenadas[0]?.corrida ?? null
  const url = rel ? rutaProxy(rel) : null
  const { data: detalle, cargando, error } = usePollingJson<CorridaDetalle>(
    url ?? "/api/dashboard/corrida/__ninguna__",
    INTERVALO_MS,
    null
  )

  const diagrama = React.useMemo(() => {
    if (!url || !detalle) return null
    return construirDiagrama(detalle)
  }, [url, detalle])

  const lienzo = useLienzo(diagrama, url)

  return (
    // Ocupa todo el ancho y alto de la pantalla y sube bajo el header fijo (h-16).
    <section className="relative -mt-16 h-svh w-full overflow-hidden bg-[#0e0e0e] text-[#e5e5e5]">
      <div
        ref={lienzo.viewportRef}
        className={`absolute inset-0 ${lienzo.arrastrando ? "cursor-grabbing" : "cursor-grab"}`}
        onPointerDown={lienzo.onPointerDown}
        onPointerMove={lienzo.onPointerMove}
        onPointerUp={lienzo.onPointerUp}
        onPointerLeave={lienzo.onPointerUp}
      >
        {diagrama && (
          <div
            style={{
              transform: `translate(${lienzo.pan.x}px, ${lienzo.pan.y}px) scale(${lienzo.zoom})`,
              transformOrigin: "0 0",
              transition: lienzo.transicion,
              willChange: "transform",
              width: diagrama.ancho,
              height: diagrama.alto,
            }}
          >
            <svg width={diagrama.ancho} height={diagrama.alto}>
              <defs>
                <marker
                  id="flecha-inferida"
                  markerWidth={8}
                  markerHeight={8}
                  refX={6}
                  refY={4}
                  orient="auto"
                >
                  <path d="M0,0 L8,4 L0,8 Z" fill="#60a5fa" />
                </marker>
              </defs>

              {diagrama.columnas.map((col, i) => {
                const x = COL_GAP / 2 + i * (COL_ANCHO + COL_GAP)
                return (
                  <g key={col.agente}>
                    <rect
                      x={x - COL_PAD}
                      y={4}
                      width={COL_ANCHO + COL_PAD * 2}
                      height={diagrama.alto - 8}
                      rx={20}
                      fill="#171717"
                      stroke="#262626"
                    />
                    <text x={x} y={26} fontSize={13} fontWeight={700} fill="#f4f4f5">
                      {col.agente}
                    </text>
                    {col.cajas.map((caja) => {
                      const est = ESTILO_CATEGORIA[caja.categoria]
                      const titulo =
                        caja.categoria === "rechazado" && caja.cuenta && caja.cuenta > 1
                          ? `${est.etiqueta} ×${caja.cuenta}`
                          : est.etiqueta
                      const esDeriva = caja.categoria === "deposito" && caja.destinos?.length === 0
                      const esConsultaSinFuente =
                        caja.categoria === "consulta" && !caja.esReceptor && diagrama.huboDepositoValido
                      const sinConexion = esDeriva || esConsultaSinFuente
                      const sub = truncar(
                        caja.esReceptor && caja.fuentes?.length
                          ? `${subEtiqueta(caja.categoria)} · de ${formatoFuentes(caja.fuentes)}`
                          : caja.categoria === "deposito" && caja.destinos?.length
                            ? `${subEtiqueta(caja.categoria)} · leído por ${formatoFuentes(caja.destinos)}`
                            : esDeriva
                              ? `${subEtiqueta(caja.categoria)} · sin lectores`
                              : esConsultaSinFuente
                                ? `${subEtiqueta(caja.categoria)} · sin depósito previo`
                                : subEtiqueta(caja.categoria),
                        40
                      )
                      const detalleVisible = truncar(caja.detalle)
                      const tituloExtra = caja.esReceptor && caja.fuentes?.length
                        ? ` · pudo leer el depósito de: ${caja.fuentes.join(", ")} (inferido, no confirmado por el log)`
                        : caja.categoria === "deposito" && caja.destinos?.length
                          ? ` · pudo ser leído por: ${caja.destinos.join(", ")} (inferido, no confirmado por el log)`
                          : esDeriva
                            ? " · ningún agente lo consultó después (a la deriva, según lo que se puede inferir del log)"
                            : esConsultaSinFuente
                              ? " · no se encontró ningún depósito previo con el que conectar esta consulta (según lo que se puede inferir del log)"
                              : ""
                      // La "consulta" no es una acción independiente: el harness la registra
                      // (costo 0) como marca de que el comando curl justo anterior —ya cobrado
                      // ahí como Acción— tocó la red. El costo real ya se pagó arriba.
                      const notaConsulta =
                        caja.categoria === "consulta"
                          ? " · costo 0 porque no es una acción aparte: es el registro de que el comando anterior (ya cobrado como Acción) fue un curl a la red"
                          : ""
                      // Metadata visible en toda caja (hora de reloj y el
                      // presupuesto real tal como lo registró el log: "costo N,
                      // restantes M"). Si ese texto ya quedó como detalle
                      // visible (p. ej. entrega/tope, donde no hay nada mejor
                      // que mostrar arriba), no se repite dos veces.
                      const meta =
                        caja.restanteTexto && caja.restanteTexto !== detalleVisible
                          ? `${formatoHora(caja.t)} · ${caja.restanteTexto}`
                          : caja.restanteTexto
                            ? formatoHora(caja.t)
                            : `${formatoHora(caja.t)} · costo ${caja.costo}`
                      let cursorY = caja.y + 19
                      const tituloY = cursorY
                      cursorY += 13
                      const subY = sub ? cursorY : null
                      if (sub) cursorY += 13
                      const detalleY = detalleVisible ? cursorY : null
                      if (detalleVisible) cursorY += 13
                      const metaY = cursorY
                      return (
                        <g key={caja.seq}>
                          {caja.esReceptor && (
                            <rect
                              x={caja.x - 3}
                              y={caja.y - 3}
                              width={COL_ANCHO + 6}
                              height={CAJA_ALTO + 6}
                              rx={13}
                              fill="none"
                              stroke="#facc15"
                              strokeWidth={1.5}
                              strokeDasharray="3 2"
                              strokeOpacity={0.85}
                            />
                          )}
                          {sinConexion && (
                            <rect
                              x={caja.x - 3}
                              y={caja.y - 3}
                              width={COL_ANCHO + 6}
                              height={CAJA_ALTO + 6}
                              rx={13}
                              fill="none"
                              stroke="#f87171"
                              strokeWidth={1.5}
                              strokeDasharray="2 3"
                              strokeOpacity={0.7}
                            />
                          )}
                          <rect
                            x={caja.x}
                            y={caja.y}
                            width={COL_ANCHO}
                            height={CAJA_ALTO}
                            rx={10}
                            fill={est.fill}
                            stroke={est.stroke}
                            strokeWidth={1.25}
                          >
                            <title>
                              {`${col.agente} · ronda ${caja.ronda} · ${formatoHora(caja.t)} · costo ${caja.costo} · ${titulo}${caja.detalle ? ` · ${caja.detalle}` : ""}${tituloExtra}${notaConsulta}`}
                            </title>
                          </rect>
                          <text
                            x={caja.x + 12}
                            y={tituloY}
                            fontSize={11}
                            fill={est.texto}
                            fontWeight={600}
                          >
                            {titulo}
                          </text>
                          {subY && (
                            <text
                              x={caja.x + 12}
                              y={subY}
                              fontSize={9.5}
                              fill={est.texto}
                              fillOpacity={0.85}
                            >
                              {sub}
                            </text>
                          )}
                          {detalleY && (
                            <text
                              x={caja.x + 12}
                              y={detalleY}
                              fontSize={9.5}
                              fill="#a3a3a3"
                            >
                              {detalleVisible}
                            </text>
                          )}
                          <text
                            x={caja.x + 12}
                            y={metaY}
                            fontSize={8.5}
                            fill="#6b6b6b"
                          >
                            {meta}
                          </text>
                          <text
                            x={caja.x + COL_ANCHO - 8}
                            y={caja.y + 13}
                            fontSize={8}
                            textAnchor="end"
                            fill="#6b6b6b"
                          >
                            R{caja.ronda}
                          </text>
                        </g>
                      )
                    })}
                  </g>
                )
              })}

              {diagrama.conexiones.map((c, idx) => (
                <path
                  key={idx}
                  d={`M ${c.x1} ${c.y1} C ${(c.x1 + c.x2) / 2} ${c.y1}, ${(c.x1 + c.x2) / 2} ${c.y2}, ${c.x2} ${c.y2}`}
                  fill="none"
                  stroke="#60a5fa"
                  strokeOpacity={0.7}
                  strokeWidth={1.75}
                  strokeDasharray="5 4"
                  markerEnd="url(#flecha-inferida)"
                >
                  <title>
                    {`inferido: depósito de ${c.desde} pudo ser leído por ${c.hasta} (no confirmado por el log)`}
                  </title>
                </path>
              ))}
            </svg>
          </div>
        )}
      </div>

      {!url && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-[#8b8b8b]">
          No hay corridas todavía.
        </div>
      )}

      {url && cargando && !detalle && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-sm text-[#8b8b8b]">
          <LoaderIcon className="size-4 animate-spin" />
          Cargando eventos…
        </div>
      )}

      {url && error && !detalle && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-red-400">
          No se pudo cargar la corrida: {error}
        </div>
      )}

      {/* Corrida: esquina superior izquierda, bajo el header. */}
      <div className="absolute top-20 left-4 z-20 flex max-w-sm flex-col gap-2 sm:left-6">
        <Select
          value={rel ?? undefined}
          onValueChange={(value) => {
            if (value) setSeleccion(value)
          }}
        >
          <SelectTrigger className="w-72 rounded-full border-[#2b2b2b] bg-[#141414]/90 px-4 text-[#e5e5e5] backdrop-blur">
            <SelectValue placeholder="Elige una corrida" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {ordenadas.map((c) => (
              <SelectItem key={c.corrida} value={c.corrida}>
                {c.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {diagrama && !diagrama.huboDepositoValido && (
          <div className="rounded-lg border border-[#f87171]/40 bg-[#1a0f0f]/90 px-3 py-2 text-xs text-[#fca5a5] backdrop-blur">
            Esta corrida no registró ningún depósito válido (los intentos, si
            los hubo, quedaron como comando crudo o fueron rechazados) — por
            eso ninguna consulta pudo conectarse a nada: no se marcan como
            &quot;a la deriva&quot; una por una porque todas están en la misma
            situación.
          </div>
        )}
      </div>

      {/* Modelo: esquina superior derecha, bajo el header, con el icono de su empresa. */}
      {modelos.length > 0 && (
        <div className="absolute top-20 right-4 z-20 sm:right-6">
          <Select
            value={modeloSeleccion ?? undefined}
            onValueChange={(value) => {
              if (value) onModeloChange(value)
            }}
          >
            <SelectTrigger className="w-64 rounded-full border-[#2b2b2b] bg-[#141414]/90 px-4 text-[#e5e5e5] backdrop-blur">
              <SelectValue placeholder="Elige un modelo">
                {(value: string | null) =>
                  value ? <NombreModelo modelo={value} /> : "Elige un modelo"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {modelos.map(([m, n]) => (
                <SelectItem key={m} value={m}>
                  <NombreModelo modelo={m} />
                  <span className="text-muted-foreground">({n})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {diagrama && (
        <div className="absolute bottom-4 left-4 z-20 flex max-w-2xl flex-col gap-2 rounded-2xl border border-[#2b2b2b] bg-[#141414]/85 px-4 py-3 backdrop-blur sm:left-6">
          <div className="hidden md:block">
            <h3 className="text-sm font-semibold text-white">
              Ejecución de agentes
            </h3>
            <p className="text-xs text-[#8b8b8b]">
              Una columna por agente, orden por secuencia. Toda caja
              &quot;Comunicación&quot; es un evento real (depósito o consulta al
              puerto compartido): eso sí quedó registrado. Lo que es inferido
              son las flechas punteadas que intentan unir un depósito con las
              consultas que pudieron leerlo — el log no dice quién leyó el
              depósito de quién.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#9c9c9c]">
            {(Object.keys(ESTILO_CATEGORIA) as Categoria[]).map((cat) => (
              <span key={cat} className="flex items-center gap-1">
                <span
                  className="inline-block size-2.5 rounded-full border"
                  style={{
                    backgroundColor: ESTILO_CATEGORIA[cat].fill,
                    borderColor: ESTILO_CATEGORIA[cat].stroke,
                  }}
                />
                {ESTILO_CATEGORIA[cat].etiqueta}
                {subEtiqueta(cat) ? ` (${subEtiqueta(cat).replace(/^[←→]\s*/, "")})` : ""}
              </span>
            ))}
            <span className="flex items-center gap-1">
              <span className="inline-block h-0 w-4 border-t border-dashed border-[#60a5fa]" />
              conexión inferida
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block size-2.5 rounded-[3px] border border-dashed border-[#facc15]" />
              destino de una conexión inferida
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block size-2.5 rounded-[3px] border border-dashed border-[#f87171]" />
              comunicación sin conexión al otro extremo (a la deriva)
            </span>
            <span className="text-[#5a5a5a]">
              Ctrl + rueda para zoom · arrastrar para mover
            </span>
          </div>
        </div>
      )}

      <div className="absolute right-4 bottom-4 z-20 flex gap-1 sm:right-6">
        <button
          type="button"
          className="rounded-md border border-[#2b2b2b] bg-[#1c1c1c] p-1.5 text-[#c9c9c9] hover:bg-[#242424]"
          onClick={lienzo.acercar}
          aria-label="Acercar"
        >
          <ZoomInIcon className="size-3.5" />
        </button>
        <button
          type="button"
          className="rounded-md border border-[#2b2b2b] bg-[#1c1c1c] p-1.5 text-[#c9c9c9] hover:bg-[#242424]"
          onClick={lienzo.alejar}
          aria-label="Alejar"
        >
          <ZoomOutIcon className="size-3.5" />
        </button>
        <button
          type="button"
          className="rounded-md border border-[#2b2b2b] bg-[#1c1c1c] p-1.5 text-[#c9c9c9] hover:bg-[#242424]"
          onClick={lienzo.ajustar}
          aria-label="Ajustar a la ventana"
        >
          <Maximize2Icon className="size-3.5" />
        </button>
      </div>
    </section>
  )
}

function NombreModelo({ modelo }: { modelo: string }) {
  const logo = logoModelo(modelo)
  return (
    <span className="flex items-center gap-2">
      {logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" className="size-4 shrink-0" />
      )}
      {etiquetaModelo(modelo)}
    </span>
  )
}
